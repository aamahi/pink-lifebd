import { Suspense } from 'react';
import { pageMetadata } from '@/core/seo';
import { Search } from '@/features/search/search';

export const metadata = pageMetadata({
  title: 'Search',
  description: 'Search the catalogue.',
  path: '/search',
});

// `Search` reads `?q=` (`useSearchParams`), which a statically prerendered page cannot know; the
// boundary is what lets `next build` prerender the shell and defer the results to the client.
export default function SearchPage() {
  return (
    <Suspense>
      <Search />
    </Suspense>
  );
}
