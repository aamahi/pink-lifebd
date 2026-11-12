'use client';

import { Button } from '@/components/ui/button';
import { useSeo } from '@/core/seo';

/**
 * 404 archetype, mounted at both `/not-found` (`app/not-found/page.tsx`) and as the global 404
 * (`app/not-found.tsx`, which Next renders inside the root layout for any unmatched URL). One component
 * serves both paths -- there is no second variant to keep in sync, and a direct link to `/not-found`
 * and a mistyped URL both land on the identical screen.
 *
 * This component RENDERS. It does not redirect. `ecom-admin-ui`'s
 * `app.routes.ts:205` is `{ path: '**', redirectTo: 'login' }`, so a mistyped
 * admin URL silently lands on a login form with nothing telling the visitor the
 * page they asked for does not exist. Issue #937 names that failure by file and
 * line as the one this archetype exists to avoid.
 *
 * `noIndex: true` matters in a way it does not on the other ten archetypes: the Angular build was
 * client-rendered (`--ssr=false`) and served with a SPA fallback, so a crawler requesting a
 * nonexistent path still got HTTP 200 with this component's markup. Without the robots tag every
 * typo'd URL is an indexable duplicate of the home page rather than a dead end a crawler drops.
 * Next answers the global 404 with a 404 status and its own `noindex`, but the explicit `/not-found`
 * URL is an ordinary 200 page, so `app/not-found/page.tsx` sets `noIndex` through `pageMetadata` and
 * this component keeps the client-side call too, so both mounts behave the same in the browser.
 *
 * No `<BackLink>` here, by rule 6 of `engineering-conventions.md`: "a
 * top-level page (one with no section to return to) shows no Back control at
 * all." This page is mounted at both a dedicated path and the global 404,
 * so it has no single parent section to return to -- there is no "origin" a
 * navigation-origin hook could resolve. The two links below are ordinary,
 * real links to other top-level destinations (home, shop), not a
 * Back action, so neither is labelled "Back to ...".
 */
export function NotFound() {
  useSeo({
    title: 'Page not found',
    description: 'The page you requested does not exist on this demo site.',
    path: '/not-found',
    noIndex: true,
  });

  return (
    <section className="page-shell flex max-w-2xl flex-col items-start py-24">
      <p className="text-sm font-medium uppercase tracking-wide text-primary">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-[--color-text]">Page not found</h1>
      <p className="mt-3 text-[--color-text-muted]">
        That address does not match anything on this site. It may have moved, or the link that
        brought you here may be wrong.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/">Go to home</Button>
        <Button variant="secondary" href="/shop">
          Browse the shop
        </Button>
      </div>
    </section>
  );
}
