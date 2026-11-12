'use client';

/* eslint-disable @next/next/no-img-element -- the back and side shots are plain, lazily loaded <img>s that the hover turn drives by hand */

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Product } from '@/core/data/catalog.model';
import { defaultVariant, quickAddBlock } from '@/core/data/variant';
import { useCart } from '@/core/stores/cart.store';
import { useToast } from '@/core/stores/toast.store';
import { useWishlist } from '@/core/stores/wishlist.store';
import { assetUrl } from '@/core/utils/asset-url';
import { cn } from '@/core/utils/cn';
import { formatMoney } from '@/core/utils/money';
import { ClickableRow } from '@/components/shared/navigation/clickable-row';
import { RecordLink } from '@/components/shared/navigation/record-link';
import { HEART_PATH } from '@/components/ui/heart-path';
import { hookShiftPercent } from '@/components/ui/hook-shift';
import { Img } from '@/components/ui/image';

/** Colour dots shown before the "+n" overflow count. */
const MAX_DOTS = 4;

export interface ProductCardProps {
  readonly product: Product;
  /** Above the fold when this card is first drawn: load its photo eagerly. */
  readonly priority?: boolean;
}

/**
 * One product in the shop grid: photo on a warm grey tile with a wishlist heart
 * in its top-right corner, then name, price with any offer and the colourway
 * dots. (`Product.badge` is not shown here; the grid reads cleaner without it.)
 *
 * The whole card opens the product page through `<ClickableRow>`; the name
 * is also a real `<RecordLink>` for keyboard and screen-reader users. The
 * heart and the Add to cart button are inner buttons, which the row directive
 * lets keep their own clicks.
 *
 * Add to cart is a quick add: the first colourway in M (or the first size), as
 * the home hero's detail panel defaults, named that way in the cart and the
 * toast. It is disabled -- with the reason given -- for a product with no
 * stated price, which the product page also refuses to sell, and for a tracked
 * stock of 0. On a narrow card the label folds to the bag icon alone.
 *
 * **Hover turn.** While a mouse rests on the card the garment turns slowly on
 * its hanger (90 deg/s, easing up to speed): the front photo turns away, the
 * side shot cross-fades in over the edge-on moment (the rail's 0.44-0.56
 * band, mirrored to the direction of turn, hook re-centred), and the back
 * photo shows while it faces away. On leaving it carries on round to face
 * the front rather than snapping back. No turn on touch (there is no hover)
 * or under reduced motion; nothing runs while the card is still.
 *
 * A missing photo shows a quiet "No image" tile rather than a broken image, a
 * missing price shows the unavailable dash through `formatMoney`, and only a
 * tracked stock of 0 says "Sold out" -- an untracked (null) stock is orderable.
 */
export function ProductCard({ product, priority = false }: ProductCardProps) {
  /**
   * `priority`, frozen at creation. The image component may not have it change
   * after load, but a card's position does change as filters reorder the grid;
   * a card that started in the first row simply stays eager.
   */
  const [eager] = useState(priority);

  const wishlist = useWishlist();
  const cart = useCart();
  const toast = useToast();
  /** True for 1.6s after an add, so the click visibly landed. */
  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const spinRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLImageElement>(null);
  /** The turn: angle in degrees, current speed, whether a mouse is on the card. */
  const turn = useRef({ angle: 0, speed: 0, hovering: false, raf: 0, last: 0 });
  const hookShift = useRef(0);

  useEffect(() => {
    const t = turn.current;
    return () => {
      clearTimeout(addedTimer.current);
      cancelAnimationFrame(t.raf);
    };
  }, []);

  const findHook = useCallback((img: HTMLImageElement): void => {
    const shift = hookShiftPercent(img);
    if (shift !== null) hookShift.current = shift;
  }, []);

  // The side shot's `load` can land before React has attached its handler (the server-rendered
  // <img> starts downloading as soon as the HTML parses), and a missed `load` never fires again.
  // A photo that is already complete is measured here instead.
  const side = product.sideImage;
  useEffect(() => {
    const img = sideRef.current;
    if (img?.complete && img.naturalWidth > 0) findHook(img);
  }, [side, findHook]);

  const paintTurn = useCallback((): void => {
    const spin = spinRef.current;
    if (!spin) return;
    const a = turn.current.angle;
    spin.style.transform = a ? `rotateY(${a.toFixed(2)}deg)` : '';
    const sideEl = sideRef.current;
    if (!sideEl) return;
    const rad = (a * Math.PI) / 180;
    const facing = Math.abs(Math.cos(rad));
    spin.style.opacity = a ? Math.min(1, Math.max(0, (facing - 0.44) / 0.12)).toFixed(3) : '';
    sideEl.style.opacity = Math.min(1, Math.max(0, (0.56 - facing) / 0.12)).toFixed(3);
    // Mirrored to the direction of turn; the hook shift sits inside the flip.
    const shift = `translateX(${hookShift.current.toFixed(2)}%)`;
    sideEl.style.transform = Math.sin(rad) < 0 ? `scaleX(-1) ${shift}` : shift;
  }, []);

  const step = useCallback(
    (now: number): void => {
      const t = turn.current;
      const dt = t.last ? Math.min(0.05, (now - t.last) / 1000) : 1 / 60;
      t.last = now;
      if (t.hovering) {
        // Ease up to a slow 90 deg/s: one full turn every four seconds.
        t.speed += (90 - t.speed) * (1 - Math.exp(-dt * 3));
        t.angle += t.speed * dt;
      } else {
        // Carry on round to the next whole turn, at no less than 60 deg/s.
        const home = Math.ceil(t.angle / 360) * 360;
        const left = home - t.angle;
        const move = Math.max(left * (1 - Math.exp(-dt * 4)), 60 * dt);
        if (left <= move) {
          t.angle = 0;
          t.speed = 0;
          t.raf = 0;
          paintTurn();
          return;
        }
        t.angle += move;
      }
      paintTurn();
      t.raf = requestAnimationFrame(step);
    },
    [paintTurn],
  );

  const startTurn = (event: PointerEvent<HTMLElement>): void => {
    const reduce =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (event.pointerType !== 'mouse' || reduce || !spinRef.current) return;
    const t = turn.current;
    t.hovering = true;
    if (!t.raf) {
      t.last = 0;
      t.raf = requestAnimationFrame(step);
    }
  };

  const stopTurn = (): void => {
    turn.current.hovering = false;
  };

  /** Why this card cannot be added, or null when it can. */
  const blocked = quickAddBlock(product);
  const cartText =
    blocked === 'price' ? 'Unavailable' : blocked === 'stock' ? 'Sold out' : 'Add to cart';
  const cartLabel =
    blocked === 'price'
      ? `${product.name} has no price yet and cannot be added`
      : blocked === 'stock'
        ? `${product.name} is sold out`
        : `Add ${product.name} to cart`;

  const route = ['/product', product.slug];
  const price = formatMoney(product.price, { compact: true });
  /** Only a real reduction is an offer: a compare-at at or below the price shows nothing. */
  const wasPrice =
    product.price !== null &&
    product.compareAtPrice !== null &&
    product.compareAtPrice > product.price
      ? formatMoney(product.compareAtPrice, { compact: true })
      : null;
  const dots = product.colors.slice(0, MAX_DOTS);
  const extraColors = Math.max(0, product.colors.length - MAX_DOTS);
  const colorSummary = product.colors.length === 1 ? '1 colour' : `${product.colors.length} colours`;
  const saved = wishlist.ids.has(product.id);

  const addToCart = (): void => {
    if (blocked !== null) return;
    const line = defaultVariant(product);
    cart.add(line);
    toast.show(`${line.name} added to cart`, { tone: 'success' });
    setJustAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 1600);
  };

  const toggleWishlist = (): void => {
    const p = product;
    const nowSaved = wishlist.toggle(p);
    toast.show(nowSaved ? `${p.name} saved to wishlist` : `${p.name} removed from wishlist`, {
      tone: nowSaved ? 'success' : 'info',
    });
  };

  return (
    // The Angular host element was `display: block` and sat between the grid's <li> and the
    // <article>, so the article's `h-full` had an auto-height parent and never stretched. This
    // wrapper keeps that, so the cards in a row keep their own heights as they do on the original.
    <div className="block">
      <ClickableRow
        as="article"
        route={route}
        className="group relative flex h-full flex-col"
        onPointerEnter={startTurn}
        onPointerLeave={stopTurn}
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-(--color-shop-tile) transition-colors group-hover:bg-(--color-shop-tile-hover)">
          {product.image ? (
            <div className="absolute inset-4 [perspective:1100px]">
              <div ref={spinRef} className="absolute inset-0 [transform-style:preserve-3d]">
                <Img
                  src={product.image}
                  alt={product.name}
                  width={645}
                  height={1000}
                  priority={eager}
                  className="absolute inset-0 block [backface-visibility:hidden]"
                  imgClass="mx-auto h-full w-auto"
                />
                <img
                  src={assetUrl(product.backImage ?? product.image)}
                  alt=""
                  width="645"
                  height="1000"
                  loading="lazy"
                  draggable={false}
                  className="absolute inset-0 mx-auto h-full w-auto [backface-visibility:hidden] [transform:rotateY(180deg)]"
                />
              </div>
              {product.sideImage && (
                <img
                  ref={sideRef}
                  src={assetUrl(product.sideImage)}
                  alt=""
                  width="645"
                  height="1000"
                  loading="lazy"
                  draggable={false}
                  className="pointer-events-none absolute inset-0 mx-auto h-full w-auto opacity-0"
                  onLoad={(event) => findHook(event.currentTarget)}
                />
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-(--color-rail-muted)">
              <svg
                viewBox="0 0 24 24"
                className="size-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                aria-hidden="true"
              >
                <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                <circle cx="9" cy="10" r="1.6" />
                <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
              </svg>
              No image
            </div>
          )}
          {product.stock === 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-(--color-rail-fg) px-2.5 py-1 text-[11px] font-medium text-(--color-rail-bg)">
              Sold out
            </span>
          )}
          {/* Top-right of the tile, level with "Sold out". z-10 keeps it above the
              row's link overlay, so the heart takes its own click. */}
          <button
            type="button"
            className="absolute right-3 top-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-(--color-rail-bg)/85 text-(--color-rail-fg) shadow-sm outline-none backdrop-blur-sm transition-[background-color,transform] hover:bg-(--color-rail-bg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) active:scale-90"
            aria-pressed={saved}
            aria-label={(saved ? 'Remove ' : 'Save ') + product.name + ' to wishlist'}
            onClick={toggleWishlist}
          >
            <svg
              viewBox="0 0 18 18"
              className="size-[18px]"
              stroke="currentColor"
              strokeWidth="1.125"
              fill={saved ? 'currentColor' : 'none'}
              aria-hidden="true"
            >
              <path d={HEART_PATH} />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex flex-1 flex-col">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-(--color-rail-fg) [&_a]:text-(--color-rail-fg) [&_a]:no-underline [&_a:hover]:underline">
            <RecordLink route={route}>{product.name}</RecordLink>
          </h3>
          <div className="mt-auto flex items-end justify-between gap-2 pt-1.5 @container">
            <div className="min-w-0">
              <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-semibold text-(--color-rail-fg)">{price}</span>
                {wasPrice && (
                  <span className="text-xs text-(--color-rail-muted) line-through">{wasPrice}</span>
                )}
              </p>
              {product.colors.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5" aria-label={colorSummary}>
                  {dots.map((c) => (
                    <span
                      key={c.name}
                      className="size-3 rounded-full ring-1 ring-black/10"
                      style={{ background: c.swatch }}
                      title={c.name}
                      aria-hidden="true"
                    ></span>
                  ))}
                  {extraColors > 0 && (
                    <span className="text-[11px] text-(--color-rail-muted)" aria-hidden="true">
                      +{extraColors}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="relative z-10 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-(--color-rail-fg) px-3 text-xs font-medium text-(--color-rail-bg) outline-none transition-[opacity,transform] hover:opacity-85 focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:bg-(--color-rail-border) disabled:text-(--color-rail-muted) disabled:active:scale-100"
              disabled={blocked !== null}
              aria-label={cartLabel}
              title={blocked === 'price' ? 'No price yet, so this cannot be added' : undefined}
              onClick={addToCart}
            >
              {justAdded ? (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  <span className="hidden @[13rem]:inline">Added</span>
                </>
              ) : (
                <>
                  {blocked === null && (
                    <span
                      className="block size-4 shrink-0 bg-current [mask:url(/icons/bag.svg)_center/100%_100%_no-repeat]"
                      aria-hidden="true"
                    ></span>
                  )}
                  <span className={cn(blocked === null && 'hidden', '@[13rem]:inline')}>
                    {cartText}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </ClickableRow>
    </div>
  );
}
