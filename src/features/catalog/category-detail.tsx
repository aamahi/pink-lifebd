'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { listProducts } from '@/core/data/catalog.api';
import type { Product } from '@/core/data/catalog.model';
import { stockLabel, stockTone } from '@/core/data/stock';
import { useSeo } from '@/core/seo';
import { formatMoney } from '@/core/utils/money';
import { ClickableRow } from '@/components/shared/navigation/clickable-row';
import { RecordLink } from '@/components/shared/navigation/record-link';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs, type Crumb } from '@/components/ui/breadcrumbs';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { CategoryDetailData } from './category-detail.resolver';
import { FilterSidebar } from './sections/filter-sidebar/filter-sidebar';
import { SortBar, type SortOption } from './sections/sort-bar/sort-bar';

const LOADING_CARDS = [0, 1, 2, 3, 4, 5];

export interface CategoryDetailProps {
  /** The `[slug]` route parameter. */
  readonly slug: string;
  /** What `categoryDetailResolver(slug)` resolved, fetched by the route's server `page.tsx`. */
  readonly category: CategoryDetailData;
}

/** A null price sorts to the end regardless of direction -- an unknown price is not "cheapest" or "most expensive", it is unranked. */
function compare(a: Product, b: Product, order: SortOption): number {
  if (order === 'name') return a.name.localeCompare(b.name);
  if (a.price === null) return b.price === null ? 0 : 1;
  if (b.price === null) return -1;
  return order === 'price-asc' ? a.price - b.price : b.price - a.price;
}

/**
 * PLP / category-detail archetype, at `/shop/[slug]` -- resolved by
 * `category-detail.resolver.ts` in the route's server `page.tsx` before this renders.
 *
 * `category` is what that resolver returned, and `slug` is the route parameter, passed separately
 * for the SEO path and the not-found message. The route renders this with `key={slug}`, so a
 * navigation between two categories remounts it instead of leaving the first category's
 * filters and retry state on screen under the second one's URL.
 *
 * Four branches, and NOT-FOUND is a fifth carried the way `product.tsx` carries it: a category
 * slug that resolves to nothing is a distinct fact from a category that resolved but filtered
 * down to zero visible products, and the two get different copy for the same reason
 * `product.tsx`'s header comment gives -- a redirect would lose the slug the user actually typed.
 *
 * LOADING here is reachable only through `retryAfterFailure()`: the initial load already
 * happened in the resolver before this component exists, so there is no in-component window for a
 * first-load spinner. A retry after a FAILED resolve re-fetches directly through the catalogue,
 * which is what gives this page a genuine, demonstrable loading state.
 */
export function CategoryDetail({ slug, category: data }: CategoryDetailProps) {
  const [error, setError] = useState<string | null>(data.error);
  const [loading, setLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<readonly Product[]>(data.products);

  const [sort, setSort] = useState<SortOption>('name');
  const [selectedTags, setSelectedTags] = useState<readonly string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);

  const notFound = data.error === null && data.category === null;
  const categoryName = data.category?.name ?? slug;

  // Applied from the resolved data, not from the retry state below: it states what the route
  // resolved to, and a retry that succeeds does not rename the page.
  useSeo(
    data.error
      ? { title: 'Category unavailable', path: `/shop/${slug}`, noIndex: true }
      : data.category === null
        ? { title: 'Category not found', path: `/shop/${slug}`, noIndex: true }
        : {
            title: data.category.name,
            description: `Shop ${data.category.name.toLowerCase()} products.`,
            path: `/shop/${slug}`,
          },
  );

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const p of allProducts) for (const t of p.tags) tags.add(t);
    return [...tags].sort();
  }, [allProducts]);

  const visible = useMemo(() => {
    const filtered = allProducts.filter(
      (p) =>
        (selectedTags.length === 0 || selectedTags.some((t) => p.tags.includes(t))) &&
        (!inStockOnly || (p.stock !== null && p.stock > 0)),
    );
    return [...filtered].sort((a, b) => compare(a, b, sort));
  }, [allProducts, selectedTags, inStockOnly, sort]);

  const crumbs: readonly Crumb[] = [{ label: 'Shop', href: '/shop' }, { label: categoryName }];

  /**
   * Re-fetches directly through the catalogue, bypassing the resolver --
   * this is the one place in the page where LOADING is genuinely reachable,
   * since the resolver's own fetch already finished before this component was
   * rendered.
   */
  const retryAfterFailure = (): void => {
    setLoading(true);
    setError(null);
    listProducts().then(
      (all) => {
        setAllProducts(all.filter((p) => p.category === slug));
        setLoading(false);
      },
      (err: unknown) => {
        setError(err instanceof Error ? err.message : 'Request failed.');
        setLoading(false);
      },
    );
  };

  return (
    <section className="page-shell py-10">
      {notFound ? (
        <>
          <h1 className="text-2xl font-bold text-[--color-text]">Category not found</h1>
          <p className="mt-2 text-[--color-text-muted]">
            Nothing here matches <code className="font-mono">{slug}</code>.
          </p>
          <Link className="mt-6 inline-block text-primary hover:underline" href="/shop">
            Browse the shop
          </Link>
        </>
      ) : error ? (
        <ErrorState
          title="Could not load this category"
          message={error}
          onRetry={retryAfterFailure}
        />
      ) : loading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {LOADING_CARDS.map((i) => (
              <Card key={i}>
                <Skeleton count={4} height="1.1rem" />
              </Card>
            ))}
          </div>
          <p className="sr-only" role="status">
            Loading category
          </p>
        </>
      ) : (
        <>
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[--color-text]">
            {categoryName}
          </h1>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row">
            <FilterSidebar
              tags={availableTags}
              selectedTags={selectedTags}
              inStockOnly={inStockOnly}
              onSelectedTagsChange={setSelectedTags}
              onInStockOnlyChange={setInStockOnly}
            />

            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[--color-text-muted]">
                  {visible.length} of {allProducts.length} product(s)
                </p>
                <SortBar value={sort} onValueChange={setSort} />
              </div>

              {visible.length === 0 ? (
                <EmptyState
                  className="mt-6 block"
                  title="No products match those filters"
                  hint="Clear the tag or stock filter to see everything in this category."
                />
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((p) => (
                    <ClickableRow key={p.id} route={['/product', p.slug]}>
                      <Card interactive>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-[--color-text]">
                            <RecordLink route={['/product', p.slug]}>{p.name}</RecordLink>
                          </p>
                          <Badge tone={stockTone(p)}>{stockLabel(p)}</Badge>
                        </div>
                        <p className="mt-3 text-lg font-semibold text-primary">
                          {formatMoney(p.price)}
                        </p>
                      </Card>
                    </ClickableRow>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
