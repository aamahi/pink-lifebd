'use client';

import { useMemo, useRef, useState } from 'react';
import { listCategories, listProducts, looksUnfiltered, usingFixtures } from '@/core/data/catalog.api';
import type { Category, Product, ProductColor } from '@/core/data/catalog.model';
import { useAsync } from '@/core/hooks/use-async';
import { cn } from '@/core/utils/cn';
import {
  enumField,
  stringField,
  useRouteViewState,
  type RouteViewStateField,
  type RouteViewStateFields,
} from '@/components/shared/navigation/use-route-view-state';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from './sections/product-card/product-card';
import { ShopFilters, type PriceChange } from './sections/shop-filters/shop-filters';
import { ShopHero } from './sections/shop-hero/shop-hero';
import { ShopSort } from './sections/shop-sort/shop-sort';
import {
  SHOP_COLLECTIONS,
  SHOP_SORTS,
  applyShopFilters,
  facetCounts,
  joinList,
  parseBound,
  priceRange,
  splitList,
  type Facet,
  type ShopFilters as ShopFilterValues,
  type ShopSort as ShopSortKey,
} from './shop-filter';

type ShopViewState = {
  q: string;
  /** A header collection (`SHOP_COLLECTIONS`); '' = all. */
  collection: string;
  /** Comma-separated slugs; a single slug is what `/shop?category=x` links send. */
  category: string;
  size: string;
  color: string;
  /** Price bounds as typed in the URL; '' = open. Parsed by `parseBound`. */
  min: string;
  max: string;
  sort: ShopSortKey;
  page: number;
};

/**
 * Three full rows of the four-column grid (from xl, 1200px). It also divides
 * evenly into the three-column (lg) and two-column (phone) layouts, so no page
 * ends on a part-filled row except the last.
 */
export const PAGE_SIZE = 12;

/**
 * The page number, kept out of the URL on page 1 so a plain /shop link and a
 * freshly filtered list read the same. Garbage or a page below 1 means page 1;
 * a page past the end is clamped by the component once it knows the count.
 */
const pageField: RouteViewStateField<number> = {
  defaultValue: 1,
  parse: (raw) => {
    const n = Number(raw);
    return raw !== null && Number.isInteger(n) && n >= 1 ? n : undefined;
  },
  serialize: (value) => (value > 1 ? String(value) : null),
};

const FIELDS: RouteViewStateFields<ShopViewState> = {
  q: stringField(''),
  collection: stringField(''),
  category: stringField(''),
  size: stringField(''),
  color: stringField(''),
  min: stringField(''),
  max: stringField(''),
  sort: enumField<ShopSortKey>('popular', SHOP_SORTS),
  page: pageField,
};

/** Sizes in wearing order, so the filter never lists "XL" before "S". */
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const SKELETONS = [0, 1, 2, 3, 4, 5, 6, 7];

const NO_PRODUCTS: readonly Product[] = [];
const NO_CATEGORIES: readonly Category[] = [];

/**
 * PLP archetype, at `/shop`: a collection banner, a filter column (category,
 * size, colour, price) and a sortable grid of product cards,
 * after the product-listing reference.
 *
 * Every filter, the sort and the search are held in the URL through `useRouteViewState`
 * (navigation contract, ecom-fullstack#82/#83) rather than local-only state:
 * all of it restores from the query string on first render and every write
 * mirrors back to the URL, so `HeaderSearch` writing `?q=`, a featured-category
 * link writing `?category=`, a shared link, and a Back navigation from a product
 * page all land on the filters the visitor had. Only the mobile filter drawer's
 * open/closed flag is local -- it is chrome, not list state.
 *
 * Filtering runs here, over the whole catalogue, through `shop-filter.ts`, which
 * also owns the rules for absent values: a product with no stated price is
 * outside any price bound and sorts last, never treated as costing 0.
 *
 * The four states are kept genuinely separate -- LOADING, FAILED, EMPTY, LOADED --
 * because collapsing any two of them produces a page that misreports. In
 * particular an empty result and a failed request must never share a branch:
 * telling a user their filter matched nothing when the API is down sends them to
 * change a filter that was fine.
 */
export function Catalog() {
  const gridRef = useRef<HTMLDivElement>(null);

  /** List-state, held in the URL -- see the component doc. */
  const view = useRouteViewState<ShopViewState>(FIELDS);
  const { state: viewState } = view;
  const query = viewState.q;
  const sort = viewState.sort;

  const selectedCategories = useMemo(() => splitList(viewState.category), [viewState.category]);
  const selectedSizes = useMemo(() => splitList(viewState.size), [viewState.size]);
  const selectedColors = useMemo(() => splitList(viewState.color), [viewState.color]);
  const min = useMemo(() => parseBound(viewState.min), [viewState.min]);
  const max = useMemo(() => parseBound(viewState.max), [viewState.max]);

  const productsRequest = useAsync(() => listProducts(), []);
  const categoriesRequest = useAsync(() => listCategories(), []);
  const products = productsRequest.status === 'ready' ? productsRequest.data : NO_PRODUCTS;
  /** Secondary: a failed category list leaves the filter column without a Category group. */
  const categories =
    categoriesRequest.status === 'ready' ? categoriesRequest.data : NO_CATEGORIES;
  const loading = productsRequest.status === 'loading';
  const error = productsRequest.status === 'error' ? productsRequest.error : null;
  /** Phones: the filter column opens as a panel above the grid. */
  const [filtersOpen, setFiltersOpen] = useState(false);

  /** The header collection being browsed, or null for the whole shop. */
  const collection = SHOP_COLLECTIONS.find((c) => c.slug === viewState.collection) ?? null;

  const filters = useMemo<ShopFilterValues>(
    () => ({
      q: query,
      collection: collection?.slug ?? '',
      categories: selectedCategories,
      sizes: selectedSizes,
      colors: selectedColors,
      min,
      max,
    }),
    [query, collection, selectedCategories, selectedSizes, selectedColors, min, max],
  );

  const visible = useMemo(() => applyShopFilters(products, filters, sort), [products, filters, sort]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  /** The URL's page, clamped: a stale ?page=5 on a two-page list shows page 2, not nothing. */
  const page = Math.min(viewState.page, pageCount);
  const paged = useMemo(
    () => visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visible, page],
  );
  /** "1–9 of 11": the positions on this page within the whole filtered list. */
  const rangeLabel = (() => {
    const total = visible.length;
    const first = (page - 1) * PAGE_SIZE + 1;
    const last = Math.min(page * PAGE_SIZE, total);
    return total <= PAGE_SIZE ? `${total}` : `${first}–${last} of ${total}`;
  })();

  const counts = useMemo<Record<Facet, ReadonlyMap<string, number>>>(
    () => ({
      categories: facetCounts(products, filters, 'categories'),
      sizes: facetCounts(products, filters, 'sizes'),
      colors: facetCounts(products, filters, 'colors'),
    }),
    [products, filters],
  );

  /** Every size any product comes in, in wearing order. */
  const sizeOptions = useMemo(() => {
    const present = new Set(products.flatMap((p) => p.sizes));
    const known = SIZE_ORDER.filter((s) => present.has(s));
    return [...known, ...[...present].filter((s) => !SIZE_ORDER.includes(s))];
  }, [products]);

  /** Every colourway, once each by name, in the order products first use them. */
  const colorOptions = useMemo(() => {
    const seen = new Map<string, ProductColor>();
    for (const p of products) for (const c of p.colors) if (!seen.has(c.name)) seen.set(c.name, c);
    return [...seen.values()];
  }, [products]);

  const range = useMemo(() => priceRange(products), [products]);

  /**
   * "All products", or the collection and/or the category's own name when
   * one is chosen: "Woman", "T-shirts", "Woman · T-shirts".
   */
  const heading = (() => {
    const category =
      selectedCategories.length === 1
        ? (categories.find((c) => c.slug === selectedCategories[0])?.name ?? null)
        : null;
    const parts = [collection?.label ?? null, category].filter(
      (part): part is string => part !== null,
    );
    return parts.length ? parts.join(' · ') : 'All products';
  })();

  const activeFilterCount =
    selectedCategories.length +
    selectedSizes.length +
    selectedColors.length +
    (min !== null || max !== null ? 1 : 0);

  /** Only meaningful against a real API; fixture filtering is local and honest. */
  const unfilteredNotice = !usingFixtures && looksUnfiltered(query, products);

  const toggle = ({ facet, value }: { facet: Facet; value: string }): void => {
    const key = facet === 'categories' ? 'category' : facet === 'sizes' ? 'size' : 'color';
    const current = splitList(view.snapshot()[key]);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    view.patch({ [key]: joinList(next), page: 1 });
  };

  const setPrice = ({ min: lo, max: hi }: PriceChange): void => {
    view.patch({
      min: lo === null ? '' : String(lo),
      max: hi === null ? '' : String(hi),
      page: 1,
    });
  };

  const setSort = (value: string): void => {
    const next = SHOP_SORTS.find((s) => s === value);
    if (next) view.patch({ sort: next, page: 1 });
  };

  const clearFilters = (): void => {
    view.patch({ q: '', category: '', size: '', color: '', min: '', max: '', page: 1 });
  };

  /** Leave the header collection and browse the whole shop, keeping the other filters. */
  const clearCollection = (): void => {
    view.patch({ collection: '', page: 1 });
  };

  const clearSearch = (): void => {
    view.patch({ q: '', page: 1 });
  };

  const browse = (): void => {
    const reduce =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    gridRef.current?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  /** Next page: the URL takes the number, and the view goes back up to the first row. */
  const goToPage = (next: number): void => {
    view.patch({ page: next });
    browse();
  };

  return (
    <div className="bg-(--color-rail-bg) font-jakarta text-(--color-rail-fg)">
      <div className="w-full px-4 py-6 lg:px-20 lg:py-8">
        <ShopHero onBrowse={browse} />

        {unfilteredNotice && (
          <Alert className="mt-4 block" tone="warning" title="Search may not be applied">
            The server returned results that do not mention &quot;{query}&quot;. It may be ignoring
            the search parameter rather than filtering by it. Results below are shown unchanged.
          </Alert>
        )}

        <div
          ref={gridRef}
          className="mt-8 scroll-mt-28 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10"
        >
          <button
            type="button"
            className="mb-4 inline-flex h-10 items-center gap-2 rounded-lg border border-(--color-rail-border) px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) lg:hidden"
            aria-expanded={filtersOpen}
            aria-controls="shop-filters"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-(--color-rail-fg) text-[11px] text-(--color-rail-bg)">
                {activeFilterCount}
              </span>
            )}
          </button>

          <aside
            id="shop-filters"
            aria-label="Filters"
            className={cn('mb-8 lg:mb-0 lg:block', !filtersOpen && 'hidden')}
          >
            <ShopFilters
              categories={categories}
              sizes={sizeOptions}
              colors={colorOptions}
              counts={counts}
              selectedCategories={selectedCategories}
              selectedSizes={selectedSizes}
              selectedColors={selectedColors}
              lo={range.lo}
              hi={range.hi}
              min={min}
              max={max}
              onFacetToggle={toggle}
              onPrice={setPrice}
              onResetAll={clearFilters}
            />
          </aside>

          <section aria-labelledby="shop-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 id="shop-heading" className="text-lg font-semibold tracking-tight">
                    {heading}
                  </h2>
                  {/* Browsing a header collection: one click back to the whole shop. */}
                  {collection && (
                    <button
                      type="button"
                      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-black/10 bg-(--color-rail-bg) pl-3 pr-2 text-xs text-(--color-rail-muted) outline-none transition-colors hover:border-(--color-rail-fg) hover:text-(--color-rail-fg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
                      aria-label={'Show all products, not only ' + collection.label}
                      onClick={clearCollection}
                    >
                      {collection.label}
                      <svg
                        viewBox="0 0 16 16"
                        className="size-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M4 4l8 8M12 4l-8 8" />
                      </svg>
                    </button>
                  )}
                </div>
                {!loading && !error && (
                  <p className="mt-0.5 text-sm text-(--color-rail-muted)" role="status">
                    Showing {rangeLabel} {visible.length === 1 ? 'product' : 'products'}
                  </p>
                )}
              </div>
              <ShopSort value={sort} onValueChange={setSort} />
            </div>

            {query && (
              <p className="mt-3 flex items-center gap-2 text-sm">
                Results for <span className="font-medium">&quot;{query}&quot;</span>
                <button
                  type="button"
                  className="rounded-full px-2 text-(--color-rail-muted) outline-none hover:text-(--color-rail-fg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
                  aria-label="Clear search"
                  onClick={clearSearch}
                >
                  &times;
                </button>
              </p>
            )}

            {error ? (
              <>
                <Alert className="mt-6 block" tone="danger" title="Could not load the catalogue">
                  {error}
                </Alert>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={productsRequest.reload}
                >
                  Try again
                </Button>
              </>
            ) : loading ? (
              <>
                <div
                  className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-3 xl:grid-cols-4"
                  aria-busy="true"
                >
                  {SKELETONS.map((i) => (
                    <div key={i}>
                      <div className="aspect-[4/5] animate-pulse rounded-xl bg-(--color-shop-tile)"></div>
                      <Skeleton className="mt-3 block" count={2} height="0.9rem" />
                    </div>
                  ))}
                </div>
                <p className="sr-only" role="status">
                  Loading products
                </p>
              </>
            ) : visible.length === 0 ? (
              <EmptyState
                className="mt-6 block"
                title="No products match those filters"
                hint="Try fewer sizes or colours, or widen the price range."
              >
                <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </EmptyState>
            ) : (
              <>
                <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
                  {paged.map((p, i) => (
                    <li key={p.id}>
                      <ProductCard product={p} priority={i < 3} />
                    </li>
                  ))}
                </ul>
                {pageCount > 1 && (
                  <div className="mt-12 flex justify-center border-t border-(--color-rail-border) pt-8">
                    <Pagination
                      tone="ink"
                      ariaLabel="Product pages"
                      totalPages={pageCount}
                      currentPage={page}
                      onPageChange={goToPage}
                    />
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
