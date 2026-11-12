'use client';

import { useEffect, useRef, useState } from 'react';
import { HEART_PATH } from '@/components/ui/heart-path';
import { useJellyRadio } from '@/components/ui/jelly-radio';
import { SpecularLight } from '@/components/ui/specular-light';
import type { Product } from '@/core/data/catalog.model';
import { quickAddBlock } from '@/core/data/variant';
import { useCart } from '@/core/stores/cart.store';
import { useToast } from '@/core/stores/toast.store';
import { useWishlist } from '@/core/stores/wishlist.store';
import { cn } from '@/core/utils/cn';
import { formatMoney } from '@/core/utils/money';
import type { DetailItem } from './rail.model';

/** Filled five-point star, 24-unit box. */
const STAR =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z';

export interface RailDetailPanelProps {
  item: DetailItem;
  titleId: string;
  /** 1 where the panel titles a page (the product page), 3 inside the hero's dialog. */
  headingLevel?: 1 | 3;
  /**
   * The catalogue product behind `item`, on the product page. The cart and the
   * wishlist then hold the real product (its id, slug and stock), and Add to
   * Cart is refused for the same reasons the shop card refuses it. null in the
   * hero, whose pieces are not in the catalogue.
   */
  product?: Product | null;
  /** The chosen colourway's index, so the page can repaint the garment to match. */
  onColorChange?: (index: number) => void;
  /** A swatch is hovered or focused: the page can start repainting ahead of the click. */
  onColorHover?: (index: number) => void;
  /**
   * Opens this piece's size guide. Absent = it has none, and the Size Guide link stays
   * `aria-disabled` rather than vanishing, so a piece without a guide still reads as designed.
   */
  onSizeGuide?: () => void;
}

const money = (amount: number | null): string => formatMoney(amount, { compact: true });

/**
 * The text side of a lifted rail piece: badge, title, rating, price with any
 * offer, description, colour and size pickers, Add to Cart and the wishlist
 * heart.
 *
 * Add to Cart puts a real line in the cart store, so the header's bag count
 * moves. The line's id carries colour and size, so two sizes of one piece are
 * two lines, as they would be at a till. The heart saves the garment itself to
 * the wishlist store. Both hold a product synthesised from the rail data --
 * these pieces are not in the catalogue -- which is safe because neither cart
 * rows nor `/wishlist` link back to a product page.
 *
 * Size Guide renders as designed. It is live when the page passes `onSizeGuide` (the product page
 * does, for a product with a size chart) and `aria-disabled` when there is no guide to open.
 */
export function RailDetailPanel({
  item,
  titleId,
  headingLevel = 3,
  product = null,
  onColorChange,
  onColorHover,
  onSizeGuide,
}: RailDetailPanelProps) {
  const cart = useCart();
  const wishlist = useWishlist();
  const toast = useToast();

  const [colorIndex, setColorIndex] = useState(0);
  const [chosenSize, setChosenSize] = useState<string | null>(null);
  /**
   * True for 1.6s after each add. The header count was the only other sign the
   * click landed, and it starts at the fixture cart's 3, so one add reading
   * "4" was easy to take for nothing having happened.
   */
  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  const color = item.colors[colorIndex] ?? null;
  /**
   * "Name · Colour" follows the chosen colourway, now that the photo is
   * repainted to it. A name without the " · " suffix is shown as given.
   */
  const title = (() => {
    const cut = item.name.lastIndexOf(' · ');
    return cut >= 0 && color ? `${item.name.slice(0, cut)} · ${color.name}` : item.name;
  })();
  /** The visitor's pick, else M when offered, else the first size. */
  const size = chosenSize ?? (item.sizes.includes('M') ? 'M' : (item.sizes[0] ?? null));
  /** The chosen size's position, for the size row's jelly motion; -1 when none. */
  const sizeIndex = size === null ? -1 : item.sizes.indexOf(size);

  /** Stars lit to the nearest whole, as the reference does: 4.8 shows five. */
  const rating = (() => {
    const { rating: value, reviewCount } = item;
    if (value === null) return null;
    const lit = Math.round(value);
    return {
      label: value.toFixed(1),
      count: reviewCount,
      stars: Array.from({ length: 5 }, (_, i) => i < lit),
    };
  })();

  /** Only a real reduction is an offer; a compare-at at or below the price shows nothing. */
  const offer = (() => {
    const { price, compareAtPrice } = item;
    if (price === null || compareAtPrice === null || compareAtPrice <= price) return null;
    return {
      was: money(compareAtPrice),
      percent: Math.round((1 - price / compareAtPrice) * 100),
    };
  })();

  const colorJelly = useJellyRadio<HTMLDivElement>(colorIndex);
  const sizeJelly = useJellyRadio<HTMLDivElement>(sizeIndex);

  /** A repeat on a wide rail is the same garment: its "~n" suffix is dropped. */
  const baseId = item.id.split('~')[0] ?? item.id;
  const saved = wishlist.ids.has(product?.id ?? `rail:${baseId}`);
  /** Why Add to Cart is refused, or null; see `quickAddBlock`. The hero's pieces are always sellable. */
  const blocked = product ? quickAddBlock(product) : null;

  const pickColor = (index: number): void => {
    setColorIndex(index);
    onColorChange?.(index);
  };

  /**
   * The rail piece as a catalogue-shaped `Product`, so the cart and the
   * wishlist can hold it. With a variant, the id and name carry colour and
   * size; the wishlist saves the garment itself, without one.
   */
  const toProduct = (variant: readonly string[]): Product => {
    if (product) {
      return {
        ...product,
        id: [product.id, ...variant].join(':'),
        name: variant.length ? `${product.name} (${variant.join(', ')})` : product.name,
      };
    }
    return {
      id: ['rail', baseId, ...variant].join(':'),
      slug: baseId,
      name: variant.length ? `${item.name} (${variant.join(', ')})` : item.name,
      summary: item.description ?? '',
      description: item.description ?? '',
      category: 'hero-rail',
      price: item.price,
      compareAtPrice: item.compareAtPrice,
      image: item.image,
      backImage: item.backImage,
      sideImage: item.sideImage,
      modelImage: null,
      gallery: [],
      sizeChart: null,
      rating: item.rating,
      reviewCount: item.reviewCount,
      stock: null,
      tags: [],
      updatedAt: new Date().toISOString(),
      badge: item.badge,
      sizes: item.sizes,
      colors: item.colors,
    };
  };

  const addToCart = (): void => {
    if (blocked !== null) return;
    const variant = [color?.name, size].filter((v): v is string => !!v);
    const line = toProduct(variant);
    cart.add(line);
    toast.show(`${line.name} added to cart`, { tone: 'success' });
    setJustAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 1600);
  };

  const toggleWishlist = (): void => {
    const line = toProduct([]);
    const nowSaved = wishlist.toggle(line);
    toast.show(nowSaved ? `${line.name} saved to wishlist` : `${line.name} removed from wishlist`, {
      tone: nowSaved ? 'success' : 'info',
    });
  };

  // h1 on the product page, where this is the page's title; h3 in the hero dialog.
  const Heading = headingLevel === 1 ? 'h1' : 'h3';

  return (
    <div className="flex flex-col gap-4 text-left">
      {item.badge ? (
        <span className="w-fit rounded-md bg-(--color-rail-fg)/[0.06] px-2.5 py-1 text-[11px] font-medium text-(--color-rail-fg)/80">
          {item.badge}
        </span>
      ) : null}
      <Heading id={titleId} className="text-3xl font-bold leading-tight tracking-tight">
        {title}
      </Heading>

      {rating ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="flex gap-0.5" aria-hidden="true">
            {rating.stars.map((lit, i) => (
              <svg
                key={i}
                viewBox="0 0 24 24"
                className={cn(
                  'size-4',
                  lit ? 'fill-(--color-rail-fg)' : 'fill-(--color-rail-border)',
                )}
              >
                <path d={STAR} />
              </svg>
            ))}
          </span>
          <span className="text-(--color-rail-muted)">
            {rating.label}
            {rating.count !== null ? ` (${rating.count} reviews)` : null}
          </span>
          <span className="sr-only">Rated {rating.label} out of 5</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xl font-bold tracking-tight">{money(item.price)}</span>
        {offer ? (
          <>
            <span className="text-sm text-(--color-rail-muted) line-through">{offer.was}</span>
            <span className="rounded bg-(--color-rail-fg) px-1.5 py-0.5 text-[11px] font-semibold text-(--color-rail-bg)">
              {offer.percent}% OFF
            </span>
          </>
        ) : null}
      </div>

      {item.description ? (
        <p className="text-sm leading-relaxed text-(--color-rail-fg)/80">{item.description}</p>
      ) : null}

      <hr className="border-(--color-rail-border)" />

      {color ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            <span className="font-medium">Color:</span> {color.name}
          </p>
          <div
            ref={colorJelly.ref}
            onKeyDown={colorJelly.onKeyDown}
            className="flex flex-wrap gap-3"
            role="radiogroup"
            aria-label="Color"
          >
            {item.colors.map((option, i) => (
              <button
                key={option.name}
                type="button"
                role="radio"
                className={cn(
                  'size-9 rounded-full border border-black/10 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-2',
                  i === colorIndex ? 'ring-2 ring-(--color-rail-fg) ring-offset-2' : '',
                )}
                style={{ background: option.swatch }}
                aria-checked={i === colorIndex}
                aria-label={option.name}
                onClick={() => pickColor(i)}
                onPointerEnter={() => onColorHover?.(i)}
                onFocus={() => onColorHover?.(i)}
              ></button>
            ))}
          </div>
        </div>
      ) : null}

      {item.sizes.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <p>
              <span className="font-medium">Size:</span> {size}
            </p>
            <button
              type="button"
              aria-disabled={onSizeGuide ? undefined : 'true'}
              onClick={onSizeGuide}
              className="inline-flex items-center gap-1.5 text-(--color-rail-fg) underline-offset-2 hover:underline"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M21.3 15.3 8.7 2.7a1 1 0 0 0-1.4 0L2.7 7.3a1 1 0 0 0 0 1.4l12.6 12.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4ZM7.5 10.5l2-2M10.5 13.5l2-2M13.5 16.5l2-2" />
              </svg>
              Size Guide
              {onSizeGuide ? null : <span className="sr-only">(coming soon)</span>}
            </button>
          </div>
          <div
            ref={sizeJelly.ref}
            onKeyDown={sizeJelly.onKeyDown}
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Size"
          >
            {item.sizes.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                className={cn(
                  'h-9 min-w-12 rounded-md border px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-2',
                  option === size
                    ? 'border-(--color-rail-fg) bg-(--color-rail-fg) text-(--color-rail-bg)'
                    : 'border-(--color-rail-border) bg-(--color-rail-bg) text-(--color-rail-fg) hover:border-(--color-rail-fg)',
                )}
                aria-checked={option === size}
                onClick={() => setChosenSize(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-1 flex gap-3">
        <button
          type="button"
          className="relative isolate inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-(--color-rail-fg) text-sm font-semibold text-(--color-rail-bg) shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45)] outline-none transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:opacity-90 focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          disabled={blocked !== null}
          onClick={addToCart}
        >
          <SpecularLight baseColor="#3f3f46" />
          {blocked === 'stock' ? (
            'Sold out'
          ) : blocked === 'price' ? (
            'Price unavailable'
          ) : justAdded ? (
            <>
              <svg
                viewBox="0 0 24 24"
                className="size-[18px] shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              Added to Cart
            </>
          ) : (
            <>
              <span
                className="block size-[18px] shrink-0 bg-current [mask:url(/icons/bag.svg)_center/100%_100%_no-repeat]"
                aria-hidden="true"
              ></span>
              Add to Cart
            </>
          )}
        </button>
        <button
          type="button"
          className={cn(
            'inline-flex size-12 shrink-0 items-center justify-center rounded-lg border text-(--color-rail-fg) outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-2',
            saved
              ? 'border-(--color-rail-fg)'
              : 'border-(--color-rail-border) hover:border-(--color-rail-fg)',
          )}
          aria-pressed={saved}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          onClick={toggleWishlist}
        >
          {/* The header's heart path (public/icons/heart.svg), inline so it can fill when saved. */}
          <svg
            viewBox="0 0 18 18"
            className="size-5 shrink-0"
            stroke="currentColor"
            strokeWidth="1.125"
            fill={saved ? 'currentColor' : 'none'}
            aria-hidden="true"
          >
            <path d={HEART_PATH} />
          </svg>
        </button>
      </div>
    </div>
  );
}
