'use client';

/* The coverflow's photos are bare <img>: each card's width, height and margin are animated by the
   module CSS, and the photo has to fill whatever box that yields (object-cover), which next/image's
   wrapper and fixed width/height would fight. */
/* eslint-disable @next/next/no-img-element */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { ClickableRow } from '@/components/shared/navigation/clickable-row';
import { RecordLink } from '@/components/shared/navigation/record-link';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { listCategories, listProducts } from '@/core/data/catalog.api';
import type { Category, Product } from '@/core/data/catalog.model';
import { defaultVariant, quickAddBlock } from '@/core/data/variant';
import { useAsync } from '@/core/hooks/use-async';
import { useCart } from '@/core/stores/cart.store';
import { useToast } from '@/core/stores/toast.store';
import { assetUrl } from '@/core/utils/asset-url';
import { cn } from '@/core/utils/cn';
import { formatMoney } from '@/core/utils/money';
import styles from './featured-products.module.css';

/** How long each piece holds the middle during autoplay, ms. */
const INTERVAL = 3500;

/** Most cards in the ring; a ring needs at least seven to always show three a side. */
const MAX_FEATURED = 10;
/** Fewest cards the ring needs: seven shown plus one hidden, where the wrap happens. */
const MIN_RING = 8;

interface RingCard {
  readonly p: Product;
  /** Unique per copy: the product id plus which repeat this is. */
  readonly key: string;
  /** Position of the piece in `featured`, for its dot. */
  readonly piece: number;
}

const NO_PRODUCTS: readonly Product[] = [];
const NO_CATEGORIES: readonly Category[] = [];

/** Heights of the loading ghost's cards, left to right. */
const GHOST = [0.8, 0.86, 0.92, 1, 0.92, 0.86, 0.8];

/**
 * The model shot when there is one, else the garment on its hanger. Model
 * shots are prepared on one 0.9:1 canvas with the person centred and whole
 * (`public/images/models/`), so they fill any card narrower than that by
 * losing only studio wall at the sides; hanger photos are framed from the
 * top, so the hook stays in frame.
 */
function photo(p: Product): string | null {
  return p.modelImage ?? p.image;
}

function price(p: Product): string {
  return formatMoney(p.price, { compact: true });
}

/**
 * Home's featured section, after the "Featured collection" reference: a
 * coverflow of tall cards. The chosen product stands large in the middle with
 * its badge, category, name set vertically down the right edge, a "start
 * from" price and a round bag button; three cards on each side shrink in
 * width and height toward the edges.
 *
 * The cards form a ring: each one's place is its offset from the chosen card
 * around the circle, so there are always three a side however far the visitor
 * clicks. Offsets beyond three are kept in the row at zero width -- which is
 * also where a card wraps from one end to the other -- so the wrap is never
 * seen and every visible move is a width/height transition. Choosing a side
 * card (click, or Left/Right with focus in the row) brings it to the middle.
 *
 * Products come from `listProducts()`: the ones with a model
 * shot (`modelImage`), or -- while the catalogue has none -- the ones with a
 * hanger photo, up to ten. One kind or the other, never mixed, so the ring
 * does not jump between a person and a hanger (demo-craft rule 3). The
 * section keeps its four states: loading (a ghost of the
 * ring), failed (with retry), empty, and the ring. The bag button is a quick
 * add with the shop card's rules (`core/data/variant.ts`).
 *
 * **Autoplay.** Every 3.5s the next piece glides to the middle. It pauses
 * while the pointer is over the cards or focus is inside the section (someone
 * is looking or about to act), and while the tab is hidden; on resume it waits
 * out only the time that was left, so a passing hover does not skip a beat. Any
 * manual move -- a card, a dot, an arrow key -- restarts the wait. Off entirely
 * under reduced motion. The dots under the ring show the position and jump to
 * a piece.
 *
 * **Short lists repeat.** Seven cards show at once, and the wrap stays hidden
 * only if at least one card sits off-screen at depth 4; with fewer than
 * eight pieces a card visibly jumped from the left end to the right. So the
 * ring (`ring`) repeats the pieces until it holds eight or more, while the
 * dots stay one per piece. With six pieces the two outermost slices can show
 * the same piece, which is the cost of never seeing the wrap.
 */
export function FeaturedProducts() {
  const cart = useCart();
  const toast = useToast();

  const productsLoad = useAsync(() => listProducts(), []);
  // Only the category label on the middle card needs these; a failed category request leaves the
  // label empty, and the product request's own error branch is what reports an outage.
  const categoriesLoad = useAsync(() => listCategories(), []);
  const categories = categoriesLoad.status === 'ready' ? categoriesLoad.data : NO_CATEGORIES;
  const loading = productsLoad.status === 'loading';
  const failed = productsLoad.status === 'error';

  const data = productsLoad.status === 'ready' ? productsLoad.data : null;
  const featured = useMemo<readonly Product[]>(() => {
    if (!data) return NO_PRODUCTS;
    const models = data.filter((p) => p.modelImage !== null);
    return (models.length > 0 ? models : data.filter((p) => p.image !== null)).slice(
      0,
      MAX_FEATURED,
    );
  }, [data]);

  /** The cards around the ring: `featured`, repeated until there are at least MIN_RING. */
  const ring = useMemo<readonly RingCard[]>(() => {
    if (featured.length === 0) return [];
    const copies = Math.ceil(MIN_RING / featured.length);
    return Array.from({ length: copies }, (_, c) =>
      featured.map((p, piece) => ({ p, piece, key: `${p.id}~${c}` })),
    ).flat();
  }, [featured]);
  const n = ring.length;

  /** Index of the card in the middle. */
  const [active, setActive] = useState(0);
  // A fresh list starts with its middle card in the middle. Adjusting state while rendering is
  // React's pattern for "reset this when that changed", and avoids a frame of the wrong card.
  const [seeded, setSeeded] = useState(featured);
  if (seeded !== featured) {
    setSeeded(featured);
    setActive(Math.floor(n / 2));
  }

  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [reduced, setReduced] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [hidden, setHidden] = useState(false);
  /** Whether the ring should be advancing on its own right now. */
  const playing =
    !reduced && !loading && !failed && featured.length > 1 && !hovering && !focusWithin && !hidden;

  /** Time left before the next advance; kept across a pause. */
  const remaining = useRef(INTERVAL);
  /** Set by a manual move so the next effect cleanup gives the new piece a full turn. */
  const fresh = useRef(false);
  /** Bumped by a manual move that does not change `active` (a dot for the piece already shown). */
  const [restarts, setRestarts] = useState(0);

  useEffect(() => {
    setReduced(
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(addedTimer.current);
    };
  }, []);

  // The autoplay clock. Each run arms one timer for what is left of the current turn; the cleanup
  // (a pause, a manual move, or the advance itself) works out what is left for the next run.
  useEffect(() => {
    // `restart()` has already put the full turn back in `remaining`; a flag left set while the
    // clock was stopped (a key press during hover) must not reset a later pause's remaining time.
    fresh.current = false;
    if (!playing || n === 0) return;
    let fired = false;
    const startedAt = Date.now();
    const timer = setTimeout(() => {
      fired = true;
      setActive((a) => (a + 1) % n);
    }, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current =
        fired || fresh.current
          ? INTERVAL
          : Math.max(0, remaining.current - (Date.now() - startedAt));
      fresh.current = false;
    };
  }, [playing, active, restarts, n]);

  const current = ring[active]?.p ?? null;
  const blocked = current ? quickAddBlock(current) : null;
  /** Which piece's dot is lit. */
  const activePiece = ring[active]?.piece ?? null;

  /** Signed place around the ring relative to the middle: 0 is the middle, -1 just left. */
  const offset = (i: number): number => {
    let o = (((i - active) % n) + n) % n;
    if (o > n / 2) o -= n;
    return o;
  };

  /** 0 middle .. 3 outermost shown; 4 = in the row but hidden. */
  const depth = (i: number): number => Math.min(4, Math.abs(offset(i)));

  const categoryName = (p: Product): string => {
    const match = categories.find((c) => c.slug === p.category);
    return match ? match.name : '';
  };

  /** A manual move: the new piece gets a full turn in the middle. */
  const restart = (): void => {
    remaining.current = INTERVAL;
    fresh.current = true;
    setRestarts((r) => r + 1);
  };

  const select = (i: number): void => {
    setActive(i);
    restart();
  };

  /** A dot: go to the nearest copy of that piece around the ring. */
  const selectPiece = (piece: number): void => {
    const pieces = featured.length;
    let best = piece;
    for (let i = piece; i < n; i += pieces) {
      const d = Math.min(Math.abs(i - active), n - Math.abs(i - active));
      const bestD = Math.min(Math.abs(best - active), n - Math.abs(best - active));
      if (d < bestD) best = i;
    }
    select(best);
  };

  const onFocusOut = (event: ReactFocusEvent<HTMLElement>): void => {
    const next = event.relatedTarget as Node | null;
    if (!next || !event.currentTarget.contains(next)) setFocusWithin(false);
  };

  /** Left/Right step the ring by one, wrapping. */
  const onKey = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (n === 0 || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    setActive((a) => (a + (event.key === 'ArrowRight' ? 1 : -1) + n) % n);
    restart();
  };

  const addToCart = (): void => {
    if (!current || blocked !== null) return;
    const line = defaultVariant(current);
    cart.add(line);
    toast.show(`${line.name} added to cart`, { tone: 'success' });
    setJustAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <section
      className="w-full overflow-hidden px-4 pb-24 pt-16 font-jakarta text-(--color-rail-fg) lg:px-20"
      aria-labelledby="featured-title"
      onFocus={() => setFocusWithin(true)}
      onBlur={onFocusOut}
    >
      <h2
        id="featured-title"
        className="text-center font-display text-4xl font-medium uppercase tracking-[0.08em] md:text-5xl"
      >
        Featured collection
      </h2>

      {productsLoad.status === 'error' ? (
        <div className="mx-auto mt-10 block max-w-xl">
          <ErrorState
            title="Could not load the collection"
            message={productsLoad.error}
            onRetry={productsLoad.reload}
          />
        </div>
      ) : loading ? (
        <>
          <div
            className={cn(styles.coverflow, 'mt-12 flex items-center justify-center')}
            aria-busy="true"
          >
            {GHOST.map((k, i) => (
              <div
                key={i}
                className="mx-1.5 shrink-0 animate-pulse rounded-2xl bg-(--color-featured-to)"
                style={{
                  height: `${k * 100}%`,
                  width: k === 1 ? 'calc(var(--track) * 0.29)' : 'calc(var(--track) * 0.11)',
                }}
              ></div>
            ))}
          </div>
          <p className="sr-only" role="status">
            Loading the featured collection
          </p>
        </>
      ) : featured.length === 0 ? (
        <div className="mx-auto mt-10 block max-w-xl">
          <EmptyState
            title="Nothing featured yet"
            hint="Pieces will appear here once the catalogue has some with photos."
          />
        </div>
      ) : (
        <>
          <div
            className={cn(styles.coverflow, 'mt-12 flex items-center justify-center')}
            role="group"
            aria-roledescription="carousel"
            aria-label="Featured collection"
            onKeyDown={onKey}
            onPointerEnter={() => setHovering(true)}
            onPointerLeave={() => setHovering(false)}
          >
            {ring.map((card, i) => {
              const p = card.p;
              const d = depth(i);
              const src = photo(p);
              return (
                <div
                  key={card.key}
                  className={cn(styles.card, 'relative shrink-0')}
                  data-d={d}
                  style={{ order: offset(i) }}
                  aria-hidden={d === 4 ? 'true' : undefined}
                >
                  {d === 0 ? (
                    <>
                      <ClickableRow
                        as="article"
                        route={['/product', p.slug]}
                        className="relative h-full w-full overflow-hidden rounded-2xl bg-linear-to-b from-(--color-featured-from) to-(--color-featured-to)"
                      >
                        {src ? (
                          <img
                            src={assetUrl(src)}
                            alt={p.name}
                            width="645"
                            height="1000"
                            draggable="false"
                            className={cn(
                              'h-full w-full',
                              p.modelImage
                                ? 'object-cover object-center'
                                : 'object-cover object-top',
                            )}
                          />
                        ) : null}
                        <div className={cn(styles.details, 'pointer-events-none absolute inset-0')}>
                          {p.badge ? (
                            <span className="absolute left-5 top-5 rounded-full bg-(--color-rail-bg)/85 px-3.5 py-1 text-xs font-medium backdrop-blur-sm">
                              {p.badge}
                            </span>
                          ) : null}
                          <div className="absolute bottom-24 right-5 top-5 flex flex-col items-end gap-4">
                            <p
                              className={cn(
                                styles.vertical,
                                'text-xs leading-tight text-(--color-rail-fg)/70',
                              )}
                            >
                              {categoryName(p)}
                            </p>
                            <p
                              className={cn(
                                styles.vertical,
                                'pointer-events-auto min-h-0 overflow-hidden text-ellipsis whitespace-nowrap text-lg font-medium leading-tight [&_a]:text-(--color-rail-fg) [&_a]:no-underline [&_a:hover]:underline',
                              )}
                            >
                              <RecordLink route={['/product', p.slug]}>{p.name}</RecordLink>
                            </p>
                          </div>
                          <div className="absolute bottom-6 right-5 text-right">
                            <p className="text-[11px] text-(--color-rail-fg)/70">Start from</p>
                            <p className="text-base font-semibold">{price(p)}</p>
                          </div>
                        </div>
                      </ClickableRow>
                      <button
                        type="button"
                        className={cn(
                          styles.details,
                          'absolute -bottom-7 left-1/2 z-10 inline-flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-(--color-rail-fg) text-(--color-rail-bg) shadow-[0_10px_24px_-8px_rgb(0_0_0/0.45)] outline-none ring-4 ring-(--color-rail-bg) transition-transform hover:scale-105 focus-visible:ring-(--color-rail-ring) active:scale-95 disabled:cursor-not-allowed disabled:bg-(--color-rail-border) disabled:text-(--color-rail-muted) disabled:hover:scale-100',
                        )}
                        disabled={blocked !== null}
                        aria-label={
                          blocked === 'price'
                            ? p.name + ' has no price yet and cannot be added'
                            : blocked === 'stock'
                              ? p.name + ' is sold out'
                              : 'Add ' + p.name + ' to cart'
                        }
                        onClick={addToCart}
                      >
                        {justAdded ? (
                          <svg
                            viewBox="0 0 24 24"
                            className="size-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        ) : (
                          <span
                            className="block size-5 bg-current [mask:url(/icons/bag.svg)_center/100%_100%_no-repeat]"
                            aria-hidden="true"
                          ></span>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="block h-full w-full overflow-hidden rounded-2xl bg-linear-to-b from-(--color-featured-from) to-(--color-featured-to) outline-none transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-2"
                      tabIndex={d === 4 ? -1 : 0}
                      aria-label={'Show ' + p.name}
                      onClick={() => select(i)}
                    >
                      {src ? (
                        <img
                          src={assetUrl(src)}
                          alt=""
                          width="645"
                          height="1000"
                          loading="lazy"
                          draggable="false"
                          className={cn(
                            'h-full w-full object-cover',
                            p.modelImage ? 'object-center' : 'object-top',
                          )}
                        />
                      ) : null}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Position dots: the current piece stretches into a pill; any dot jumps there. */}
          <div className="mt-16 flex justify-center gap-2" role="group" aria-label="Choose a piece">
            {featured.map((p, k) => (
              <button
                key={p.id}
                type="button"
                className={cn(
                  'h-1.5 rounded-full outline-none transition-[width,background-color] duration-500 focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-2',
                  k === activePiece
                    ? 'w-8 bg-(--color-rail-fg)'
                    : 'w-1.5 bg-(--color-rail-fg)/25 hover:bg-(--color-rail-fg)/50',
                )}
                aria-label={'Show ' + p.name}
                aria-current={k === activePiece ? 'true' : undefined}
                onClick={() => selectPiece(k)}
              ></button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
