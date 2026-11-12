import type { Product } from '@/core/data/catalog.model';

export const SHOP_SORTS = ['popular', 'newest', 'price-asc', 'price-desc'] as const;
export type ShopSort = (typeof SHOP_SORTS)[number];

export const SORT_LABELS: Record<ShopSort, string> = {
  popular: 'Popular',
  newest: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
};

/**
 * The header's collections, each a product tag (see `catalog.fixtures.ts`),
 * in menu order. `/shop?collection=<slug>` shows only that collection.
 */
export const SHOP_COLLECTIONS = [
  { slug: 'bras', label: 'Bras' },
  { slug: 'panties', label: 'Panties' },
  { slug: 'nightwear', label: 'Nightwear' },
  { slug: 'new', label: 'New Collections' },
] as const;

/** Everything the shop page filters by. List-valued facets are OR within, AND across. */
export interface ShopFilters {
  readonly q: string;
  /** A collection tag from the header menu; '' = every collection. */
  readonly collection: string;
  readonly categories: readonly string[];
  readonly sizes: readonly string[];
  readonly colors: readonly string[];
  /** Price bounds in `SITE.currency`; null = unbounded on that side. */
  readonly min: number | null;
  readonly max: number | null;
}

export type Facet = 'categories' | 'sizes' | 'colors';

/** "a,b" from the URL to ['a', 'b'], dropping empties. */
export const splitList = (raw: string): string[] => raw.split(',').filter(Boolean);
export const joinList = (items: readonly string[]): string => items.join(',');

/** A price bound from the URL: a non-negative number, or null when absent or garbage. */
export function parseBound(raw: string): number | null {
  if (raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function matches(p: Product, f: ShopFilters, skip?: Facet): boolean {
  const q = f.q.trim().toLowerCase();
  if (
    q &&
    !p.name.toLowerCase().includes(q) &&
    !p.summary.toLowerCase().includes(q) &&
    !p.tags.some((t) => t.includes(q))
  ) {
    return false;
  }
  if (f.collection && !p.tags.includes(f.collection)) return false;
  if (skip !== 'categories' && f.categories.length && !f.categories.includes(p.category)) {
    return false;
  }
  if (skip !== 'sizes' && f.sizes.length && !p.sizes.some((s) => f.sizes.includes(s))) {
    return false;
  }
  if (skip !== 'colors' && f.colors.length && !p.colors.some((c) => f.colors.includes(c.name))) {
    return false;
  }
  // A product whose price the API did not send cannot be shown to be inside a
  // bound, so a bound excludes it -- it is never treated as costing 0.
  if (f.min !== null && (p.price === null || p.price < f.min)) return false;
  if (f.max !== null && (p.price === null || p.price > f.max)) return false;
  return true;
}

/** Compare two optional numbers; an absent value sinks to the end whichever way the sort runs. */
function nullsLast(x: number | null, y: number | null, dir: 1 | -1): number {
  if (x === null && y === null) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  return (x - y) * dir;
}

function compare(a: Product, b: Product, sort: ShopSort): number {
  switch (sort) {
    case 'newest':
      return b.updatedAt.localeCompare(a.updatedAt);
    case 'price-asc':
      return nullsLast(a.price, b.price, 1);
    case 'price-desc':
      return nullsLast(a.price, b.price, -1);
    case 'popular':
      return nullsLast(a.rating, b.rating, -1);
  }
}

/**
 * A tracked stock of 0 -- sold out. An untracked (null) stock is orderable,
 * the house-platform default, so it is never treated as sold out here.
 */
const soldOut = (p: Product): boolean => p.stock === 0;

/**
 * The filtered list in display order. Sold-out products always come last,
 * whatever the sort -- someone browsing should meet what they can buy first --
 * and keep the chosen order among themselves.
 */
export function applyShopFilters(
  products: readonly Product[],
  f: ShopFilters,
  sort: ShopSort,
): Product[] {
  return products
    .filter((p) => matches(p, f))
    .sort((a, b) => Number(soldOut(a)) - Number(soldOut(b)) || compare(a, b, sort));
}

/**
 * How many products each option of one facet would show, counted with every
 * OTHER filter applied but not this facet's own -- the usual faceted-search
 * rule, so ticking "M" does not zero the count beside "L".
 */
export function facetCounts(
  products: readonly Product[],
  f: ShopFilters,
  facet: Facet,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of products) {
    if (!matches(p, f, facet)) continue;
    const keys =
      facet === 'categories'
        ? [p.category]
        : facet === 'sizes'
          ? p.sizes
          : p.colors.map((c) => c.name);
    for (const k of keys) {
      const seen = counts.get(k);
      counts.set(k, seen === undefined ? 1 : seen + 1);
    }
  }
  return counts;
}

/** The slider's range: every known price, rounded out to the nearest 500. */
export function priceRange(products: readonly Product[]): { lo: number; hi: number } {
  const prices = products.map((p) => p.price).filter((p): p is number => p !== null);
  if (prices.length === 0) return { lo: 0, hi: 0 };
  return {
    lo: Math.floor(Math.min(...prices) / 500) * 500,
    hi: Math.ceil(Math.max(...prices) / 500) * 500,
  };
}
