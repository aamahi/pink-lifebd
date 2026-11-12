import { Suspense } from 'react';
import { pageMetadata } from '@/core/seo';
import { Catalog } from '@/features/catalog/catalog';

export const metadata = pageMetadata({
  title: 'Shop',
  description: 'Browse the new collection: tees, shirts, hoodies and knitwear.',
  path: '/shop',
});

// `Catalog` reads the query string (`useSearchParams`), which a statically prerendered page cannot
// know; the boundary is what lets `next build` prerender the shell and defer the list to the client.
export default function ShopPage() {
  return (
    <Suspense>
      <Catalog />
    </Suspense>
  );
}
