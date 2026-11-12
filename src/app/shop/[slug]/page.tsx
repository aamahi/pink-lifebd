import { cache } from 'react';
import type { Metadata } from 'next';
import { pageMetadata } from '@/core/seo';
import { CategoryDetail } from '@/features/catalog/category-detail';
import { categoryDetailResolver } from '@/features/catalog/category-detail.resolver';

type Params = Promise<{ slug: string }>;

// The Angular resolver ran on every navigation to this route; a cached render of it would pin the
// first request's answer (and, against a real API, a stale catalogue) for every later visitor.
export const dynamic = 'force-dynamic';

// `generateMetadata` and the page both need the resolved category; `cache` makes them share ONE
// request per render instead of paying the catalogue latency twice.
const resolve = cache(categoryDetailResolver);

/**
 * The title is decided here, on the server, from the same resolved data the page uses. Setting it
 * only from `CategoryDetail`'s `useSeo` effect loses a race with Next's metadata commit during
 * hydration (measured: the tab stayed on the static fallback "Category" where the Angular app showed
 * "Bras"). `CategoryDetail` still calls `useSeo` for the client-side retry path.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await resolve(slug);
  const path = `/shop/${slug}`;
  if (data.error) return pageMetadata({ title: 'Category unavailable', path, noIndex: true });
  if (data.category === null) {
    return pageMetadata({ title: 'Category not found', path, noIndex: true });
  }
  return pageMetadata({
    title: data.category.name,
    description: `Shop ${data.category.name.toLowerCase()} products.`,
    path,
  });
}

/**
 * Category detail. A slug that matches no category is NOT a framework 404 here: the Angular
 * component renders its own "Category not found" panel (with a link to the shop and `noindex`),
 * so the resolved `category: null` is passed through and the component keeps that behaviour. A
 * failed request is told apart from it by `error`, so the FAILED branch keeps its retry.
 */
export default async function CategoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const category = await resolve(slug);
  return <CategoryDetail key={slug} slug={slug} category={category} />;
}
