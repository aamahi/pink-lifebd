import { pageMetadata } from '@/core/seo';
import { NotFound } from '@/features/not-found/not-found';

// The explicit `/not-found` URL is an ordinary 200 response, so it carries its own `noindex`; the
// global 404 (`app/not-found.tsx`) gets one from Next itself.
export const metadata = pageMetadata({
  title: 'Page not found',
  description: 'The page you requested does not exist on this demo site.',
  path: '/not-found',
  noIndex: true,
});

export default function NotFoundPage() {
  return <NotFound />;
}
