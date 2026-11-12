import { Suspense } from 'react';
import { BestSellers } from './sections/best-sellers/best-sellers';
import { CustomerReviews } from './sections/customer-reviews/customer-reviews';
import { FeaturedCategories } from './sections/featured-categories/featured-categories';
import { FeaturedProducts } from './sections/featured-products/featured-products';
import { HeroShowcase } from './sections/hero-showcase/hero-showcase';

/**
 * Home archetype (`/`), assembled from `sections/` rather than written as one
 * file -- issue #937 calls this out as "the point": a demo home page is a stack
 * of independent sections a demo author can reorder, remove or add to without
 * touching the others. `hero-showcase` and `customer-reviews` are presentation
 * over static content; `featured-categories` and `featured-products` each hit
 * the catalogue API independently and each carries its own loading/failed/empty
 * branches, so a fetch failure in one section never blanks the rest of the page.
 *
 * `featured-categories` and `best-sellers` keep their chosen pill in the query
 * string (`useRouteViewState`, which reads `useSearchParams`). Each sits in its
 * own `<Suspense>` so a statically prerendered home page defers only that
 * section to the client, rather than the whole stack.
 */
export function Home() {
  return (
    <>
      <HeroShowcase />
      <Suspense fallback={null}>
        <FeaturedCategories />
      </Suspense>
      <FeaturedProducts />
      <Suspense fallback={null}>
        <BestSellers />
      </Suspense>
      <CustomerReviews />
    </>
  );
}
