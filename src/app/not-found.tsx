import { pageMetadata } from '@/core/seo';
import { NotFound } from '@/features/not-found/not-found';

// The root not-found file supports a `metadata` export, and that is where this title has to live:
// setting it from the component's `useSeo` effect loses a race with Next's own metadata commit
// during hydration, which re-applies the root title ("Pink Life") afterwards -- measured as the tab
// reading "Pink Life" on an unmatched URL while the Angular app read "Page not found -- Pink Life".
export const metadata = pageMetadata({
  title: 'Page not found',
  description: 'The page you requested does not exist on this demo site.',
  path: '/not-found',
  noIndex: true,
});

// Next renders this inside the root layout for any URL no route matches, so the header and footer
// appear around it exactly as they did around the Angular `**` route. It RENDERS the 404 in place;
// it never redirects (see the component's header comment).
export default function GlobalNotFound() {
  return <NotFound />;
}
