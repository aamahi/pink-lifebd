import type { Metadata } from 'next';
import { pageMetadata } from '@/core/seo';
import { Product } from '@/features/product/product';

type Params = Promise<{ slug: string }>;

// The static fallback the Angular route's `title: 'Product'` gave; `Product` replaces it through
// `useSeo` with the product's own name once it has loaded (or "Not found" for a bad slug).
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return pageMetadata({ title: 'Product', path: `/product/${slug}` });
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  return <Product key={slug} slug={slug} />;
}
