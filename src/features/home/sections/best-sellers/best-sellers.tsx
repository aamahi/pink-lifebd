'use client';

import { useMemo } from 'react';
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
import { ProductCard } from '@/features/catalog/sections/product-card/product-card';

/** Two rows of five. */
const SHOWN = 10;
/** The "Popular" pill: rated at least this, out of 5. */
const POPULAR_RATING = 4.7;
const POPULAR = 'popular';

const VIEW_FIELDS = { best: stringField('') };

const NO_PRODUCTS: readonly Product[] = [];
const NO_CATEGORIES: readonly Category[] = [];

/** The ghost grid's tiles while loading. */
const GHOST = Array.from({ length: SHOWN }, (_, i) => i);

/**
 * Home "Best sellers": a title, filter pills (All, each category that has
 * pieces, Popular) with View All on the right, and two rows of five of the
 * shop's own `ProductCard` -- the same card as `/shop`, so its heart,
 * quick add and hover turn behave the same in both places.
 *
 * **Ranking.** Pieces tagged `bestseller` first, then by rating (unrated
 * last -- an unknown rating is not a low one), with a tracked stock of 0
 * always at the end, as the shop orders sold-out pieces. Ties keep the
 * catalogue's order.
 *
 * The pills are `<PillTabs>`, shared with "Shop by category": a
 * radiogroup with React Bits' JellyRadio motion.
 *
 * The chosen pill lives in the URL (`?best=`) through `useRouteViewState`,
 * so Back from a product page returns to the same filter (navigation
 * contract, rule 6). View All carries a category pill into the shop as its
 * category filter.
 *
 * Its own loading / failed / empty / loaded branches, so a failed request
 * here never blanks the rest of the home page. A pill that matches nothing
 * gets its own empty panel with a way back to All.
 */
export function BestSellers() {
  const view = useRouteViewState(VIEW_FIELDS);
  const filter = view.state.best;

  const productsLoad = useAsync(() => listProducts(), []);
  // The pills only need the categories to label themselves: a failed category request leaves
  // All and Popular, and the product request's own error branch is what reports an outage.
  const categoriesLoad = useAsync(() => listCategories(), []);
  const products = productsLoad.status === 'ready' ? productsLoad.data : NO_PRODUCTS;
  const categories = categoriesLoad.status === 'ready' ? categoriesLoad.data : NO_CATEGORIES;

  /** All, the categories that have at least one piece, then Popular. */
  const pills = useMemo<readonly Pill[]>(() => {
    const used = new Set(products.map((p) => p.category));
    return [
      { key: '', label: 'All' },
      ...categories.filter((c) => used.has(c.slug)).map((c) => ({ key: c.slug, label: c.name })),
      { key: POPULAR, label: 'Popular' },
    ];
  }, [products, categories]);

  const shown = useMemo(() => {
    const matches = products.filter((p) =>
      filter === ''
        ? true
        : filter === POPULAR
          ? p.rating !== null && p.rating >= POPULAR_RATING
          : p.category === filter,
    );
    return rank(matches).slice(0, SHOWN);
  }, [products, filter]);

  /** View All's query: a category pill becomes the shop's category filter. */
  const shopHref =
    filter === '' || filter === POPULAR
      ? '/shop'
      : { pathname: '/shop', query: { category: filter } };

  const choose = (key: string): void => view.patch({ best: key });

  return (
    <section
      className="w-full px-4 pb-24 pt-8 font-jakarta text-(--color-rail-fg) lg:px-20"
      aria-labelledby="best-sellers-title"
    >
      <h2 id="best-sellers-title" className="font-display text-4xl font-semibold md:text-5xl">
        Best sellers
      </h2>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <PillTabs pills={pills} value={filter} label="Filter best sellers" onSelected={choose} />
        <Link
          href={shopHref}
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

      {productsLoad.status === 'error' ? (
        <div className="mx-auto mt-10 block max-w-xl">
          <ErrorState
            title="Could not load the best sellers"
            message={productsLoad.error}
            onRetry={productsLoad.reload}
          />
        </div>
      ) : productsLoad.status === 'loading' ? (
        <>
          <div
            className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-5"
            aria-busy="true"
          >
            {GHOST.map((k) => (
              <div key={k} className="animate-pulse">
                <div className="aspect-[4/5] rounded-xl bg-(--color-shop-tile)"></div>
                <div className="mt-3 h-4 w-3/4 rounded bg-(--color-shop-tile)"></div>
                <div className="mt-2 h-4 w-1/3 rounded bg-(--color-shop-tile)"></div>
              </div>
            ))}
          </div>
          <p className="sr-only" role="status">
            Loading best sellers
          </p>
        </>
      ) : products.length === 0 ? (
        <div className="mx-auto mt-10 block max-w-xl">
          <EmptyState
            title="No best sellers yet"
            hint="Pieces will appear here once the catalogue has some."
          />
        </div>
      ) : shown.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-(--color-rail-muted)">Nothing under this filter yet.</p>
          <button
            type="button"
            className="h-9 rounded-md border border-(--color-rail-fg) px-4 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
            onClick={() => choose('')}
          >
            Show all
          </button>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-5">
          {shown.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function rank(products: readonly Product[]): Product[] {
  const score = (p: Product) => [
    p.stock === 0 ? 1 : 0,
    p.tags.includes('bestseller') ? 0 : 1,
    p.rating === null ? 1 : 0,
    p.rating === null ? 0 : -p.rating,
  ];
  return products
    .map((p, i) => ({ p, i, s: score(p) }))
    .sort((a, b) => {
      for (let k = 0; k < a.s.length; k++) {
        const d = (a.s[k] as number) - (b.s[k] as number);
        if (d !== 0) return d;
      }
      return a.i - b.i;
    })
    .map((x) => x.p);
}
