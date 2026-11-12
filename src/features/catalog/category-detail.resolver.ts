import { listCategories, listProducts } from '@/core/data/catalog.api';
import type { Category, Product } from '@/core/data/catalog.model';

/**
 * Resolved payload for `/shop/[slug]` (category detail), fetched by the route's server `page.tsx`
 * before the page renders -- the stand-in for the Angular route's `resolve: { category: ... }`,
 * which blocked activation until it settled.
 *
 * `category: null` with `error: null` means the slug matched nothing --
 * distinct from `error` set, which means the request itself failed. The
 * component treats the first as NOT FOUND and the second as FAILED; conflating
 * them would be the exact mistake rule 4 of `.claude/rules/engineering-
 * conventions.md` exists to prevent, one level up from a plain empty result.
 */
export interface CategoryDetailData {
  readonly category: Category | null;
  readonly products: readonly Product[];
  readonly error: string | null;
}

/**
 * Resolves the category and its products before the route renders.
 *
 * Deliberately never rejects -- the `catch` turns a failed request into a normal, resolved
 * `CategoryDetailData` with `error` set, so the page still renders and `CategoryDetail` shows the
 * FAILED branch with its retry. Letting this throw instead would hand the route to Next's error
 * boundary, which cannot say "this category failed to load" and cannot retry just the request.
 */
export async function categoryDetailResolver(slug: string): Promise<CategoryDetailData> {
  try {
    const [categories, products] = await Promise.all([listCategories(), listProducts()]);
    return {
      category: categories.find((c) => c.slug === slug) ?? null,
      products: products.filter((p) => p.category === slug),
      error: null,
    };
  } catch (err: unknown) {
    return {
      category: null,
      products: [],
      error: err instanceof Error ? err.message : 'Request failed.',
    };
  }
}
