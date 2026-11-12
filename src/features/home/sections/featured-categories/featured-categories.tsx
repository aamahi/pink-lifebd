'use client';

/* The fan's photos are bare <img>: each is positioned and turned by the module CSS's own
   transforms, which next/image's wrapper would sit in the middle of. */
/* eslint-disable @next/next/no-img-element */

import { useMemo, type CSSProperties } from 'react';
import Link from 'next/link';
import {
  stringField,
  useRouteViewState,
} from '@/components/shared/navigation/use-route-view-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { PillTabs, type Pill } from '@/components/ui/pill-tabs';
import { listCategories, listProducts } from '@/core/data/catalog.api';
import type { Category, Product } from '@/core/data/catalog.model';
import { useAsync } from '@/core/hooks/use-async';
import { assetUrl } from '@/core/utils/asset-url';
import { SHOP_COLLECTIONS } from '@/features/catalog/shop-filter';
import styles from './featured-categories.module.css';

/** Garments fanned out on each tile. */
const FAN = 3;

interface Tile {
  readonly key: string;
  readonly name: string;
  readonly count: number;
  /** Up to three front photos, the front-most first. */
  readonly photos: readonly string[];
  readonly query: Readonly<Record<string, string>>;
}

const PILLS: readonly Pill[] = SHOP_COLLECTIONS.map((c) => ({
  key: c.slug,
  label: c.label,
}));
const FIRST_PILL = SHOP_COLLECTIONS[0].slug;
const VIEW_FIELDS = { shopby: stringField(FIRST_PILL) };

const GHOST = [0, 1, 2, 3, 4];
const NO_PRODUCTS: readonly Product[] = [];
const NO_CATEGORIES: readonly Category[] = [];

/**
 * Home "Shop by category": a serif title, the header's collections as pills
 * (Bras, Panties, Nightwear, New Collections) with View All on the right,
 * and below them one tile per kind of garment in the chosen collection --
 * each a fan of up to three of its pieces on the warm shop tile, with how
 * many there are.
 *
 * A tile opens the shop filtered to both, `/shop?collection=bras&category=
 * <slug>`; View All opens the whole collection. The pills are the shared
 * `<PillTabs>` (JellyRadio motion); the chosen one lives in the URL as
 * `?shopby=` through `useRouteViewState`, so Back from the shop
 * returns to it (rule 6). The first collection is chosen by default.
 *
 * **Motion.** Choosing a pill deals the new tiles in, one after another; on
 * hover a tile's fan spreads and lifts and its arrow turns to point the way.
 * None of it under reduced motion.
 *
 * Products and categories both come from the catalogue API, so the section has
 * its own loading / failed / empty / loaded branches; a collection with no
 * pieces gets its own message with a way back to the first pill.
 */
export function FeaturedCategories() {
  const view = useRouteViewState(VIEW_FIELDS);
  /** The chosen collection; an unknown `?shopby=` falls back to the first. */
  const chosen = PILLS.some((p) => p.key === view.state.shopby) ? view.state.shopby : FIRST_PILL;

  const load = useAsync(() => Promise.all([listProducts(), listCategories()]), []);
  const products = load.status === 'ready' ? load.data[0] : NO_PRODUCTS;
  const categories = load.status === 'ready' ? load.data[1] : NO_CATEGORIES;
  const catalogueEmpty = products.length === 0;

  /** One tile per category with pieces in the chosen collection, in catalogue order. */
  const tiles = useMemo<readonly Tile[]>(() => {
    const inCollection = products.filter((p) => p.tags.includes(chosen));
    return categories.flatMap((category) => {
      const pieces = inCollection.filter((p) => p.category === category.slug);
      if (pieces.length === 0) return [];
      return [
        {
          key: `${chosen}:${category.slug}`,
          name: category.name,
          count: pieces.length,
          photos: pieces
            .map((p) => p.image)
            .filter((src): src is string => src !== null)
            .slice(0, FAN),
          query: { collection: chosen, category: category.slug },
        },
      ];
    });
  }, [products, categories, chosen]);

  const choose = (key: string): void => view.patch({ shopby: key });

  return (
    <section
      className="w-full px-4 pb-12 pt-16 font-jakarta text-(--color-rail-fg) lg:px-20"
      aria-labelledby="shop-by-category-title"
    >
      <h2 id="shop-by-category-title" className="font-display text-4xl font-semibold md:text-5xl">
        Shop by category
      </h2>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <PillTabs pills={PILLS} value={chosen} label="Choose a collection" onSelected={choose} />
        <Link
          href={{ pathname: '/shop', query: { collection: chosen } }}
          className="group inline-flex items-center gap-2 text-sm font-medium text-(--color-rail-fg) outline-none focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
        >
          View all
          <svg
            viewBox="0 0 24 24"
            className="size-5 transition-transform group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 12h16M14 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      {load.status === 'error' ? (
        <div className="mx-auto mt-10 block max-w-xl">
          <ErrorState
            title="Could not load the categories"
            message={load.error}
            onRetry={load.reload}
          />
        </div>
      ) : load.status === 'loading' ? (
        <>
          <div
            className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5"
            aria-busy="true"
          >
            {GHOST.map((k) => (
              <div
                key={k}
                className="aspect-[4/5] animate-pulse rounded-2xl bg-(--color-shop-tile)"
              ></div>
            ))}
          </div>
          <p className="sr-only" role="status">
            Loading categories
          </p>
        </>
      ) : catalogueEmpty ? (
        <div className="mx-auto mt-10 block max-w-xl">
          <EmptyState
            title="No categories yet"
            hint="Categories will appear here once the catalogue has some pieces."
          />
        </div>
      ) : tiles.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-(--color-rail-muted)">Nothing in this collection yet.</p>
          <button
            type="button"
            className="h-10 rounded-full border border-(--color-rail-fg) px-5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
            onClick={() => choose(PILLS[0]?.key ?? '')}
          >
            Show {PILLS[0]?.label}
          </button>
        </div>
      ) : (
        <ul
          className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-[repeat(var(--n),minmax(0,1fr))]"
          style={{ '--n': tiles.length } as CSSProperties}
        >
          {/* On wide screens the tiles share the row whatever their number (3 to 5
                categories, by collection), rather than leaving empty columns. */}
          {/* Keyed by collection and category, so a new pill deals fresh tiles in. */}
          {tiles.map((tile, i) => {
            /* On a phone the grid is two columns, so a collection with an odd number of tiles
               (each of the three has exactly one today) would leave its last tile at half width
               beside an empty half. That tile takes the whole row instead. */
            const fillsRow = i === tiles.length - 1 && tiles.length % 2 === 1;
            return (
              <li
                key={tile.key}
                className={`${styles.tile} ${fillsRow ? 'max-md:col-span-2' : ''}`}
                style={{ '--i': i } as CSSProperties}
              >
                <Link
                  href={{ pathname: '/shop', query: tile.query }}
                  className={`group relative block aspect-[4/5] ${fillsRow ? 'max-sm:aspect-square sm:max-md:aspect-[2/1]' : ''} overflow-hidden rounded-2xl bg-(--color-shop-tile) text-(--color-rail-fg) no-underline outline-none lg:aspect-auto lg:h-[24rem] transition-colors duration-300 hover:bg-(--color-shop-tile-hover) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-2`}
                >
                  <div className="absolute inset-x-0 bottom-[4.75rem] top-5" aria-hidden="true">
                    {tile.photos.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-(--color-rail-muted)">
                        <svg
                          viewBox="0 0 24 24"
                          className="size-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        >
                          <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                          <circle cx="9" cy="10" r="1.6" />
                          <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
                        </svg>
                        No image
                      </div>
                    ) : null}
                    {tile.photos.map((src, k) => (
                      <img
                        key={src}
                        src={assetUrl(src)}
                        alt=""
                        width="645"
                        height="1000"
                        loading="lazy"
                        draggable="false"
                        className={`${styles.garment} absolute left-1/2 top-0 h-full w-auto max-w-none`}
                        data-k={k}
                        style={{ zIndex: 3 - k }}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium">{tile.name}</p>
                      <p className="mt-0.5 text-xs text-(--color-rail-muted)">
                        {tile.count} {tile.count === 1 ? 'piece' : 'pieces'}
                      </p>
                    </div>
                    <span
                      className={`${styles.arrow} inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-(--color-rail-fg) text-(--color-rail-bg)`}
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 17 17 7M9 7h8v8" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
