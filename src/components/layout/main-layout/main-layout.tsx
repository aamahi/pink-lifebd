'use client';

import { Suspense, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { NavigationOriginTracker } from '@/components/shared/navigation/use-navigation-origin';
import { ToastHost } from '@/components/ui/toast-host';
import { environment } from '@/core/config/env';
import { usingFixtures } from '@/core/data/catalog.api';
import { useCartStore } from '@/core/stores/cart.store';
import { BottomBar } from '../header/bottom-bar/bottom-bar';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';

/**
 * Per-route chrome flags. The Angular app read them off `data.layout` on the DEEPEST matched route
 * snapshot; here they are a function of the pathname, because a page component never branches on
 * its own route to decide whether to render a header -- this is the only place that decides.
 * Add more flags here as a demo author needs them -- `hideCartDrawer` in the source repo's own
 * layout is the example issue #937 names as the next one.
 */
export interface RouteLayoutFlags {
  readonly hideHeader?: boolean;
  readonly hideFooter?: boolean;
  /** Hides the dev-only "Fixture data" note, for a page a client or customer is looking at. */
  readonly hideFixtureBadge?: boolean;
}

/**
 * Bare chrome for the two auth routes (login.tsx's header comment says why they are the only
 * routes in the tree carrying this flag), and no footer -- nor bottom tab bar -- while paying:
 * nothing to wander off to, and on a phone the page's own Place order bar is the only thing at the
 * foot of the screen.
 */
export function layoutFlagsFor(pathname: string): RouteLayoutFlags {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path === '/account/login' || path === '/account/register') {
    return { hideHeader: true, hideFooter: true };
  }
  if (path === '/checkout') return { hideFooter: true };
  // Ad landing pages (`/lp/*`) carry their own slim bar and sticky order button, so the full
  // header, footer and bottom tab bar would only give a visitor from an ad somewhere else to go.
  // They are shown to customers (and to the owner, judging them), so the developer's fixture note
  // stays off them too.
  if (path.startsWith('/lp/')) {
    return { hideHeader: true, hideFooter: true, hideFixtureBadge: true };
  }
  return {};
}

/**
 * Module-level, not a `useRef`: it must also survive `MainLayout` being unmounted and mounted again
 * (a hot reload, a test harness). Together with the store's own `hydrated` check it makes the call
 * below idempotent, so React StrictMode's double-invoked mount effect does not fire the cart request
 * twice.
 */
let cartHydrationStarted = false;

/**
 * The shell every route renders inside of -- `src/app/layout.tsx` wraps the whole tree in this
 * component, so navigating between any two routes swaps only `children` and never re-creates the
 * header, the footer or the toast host (issue #937, "navigating does not re-create the shell").
 *
 * Chrome visibility is driven entirely by `layoutFlagsFor()` above, recomputed on every pathname
 * change.
 *
 * `<ToastHost />` is mounted here, once, unconditionally -- toasts are not chrome and should still
 * reach a bare `hideHeader`/`hideFooter` page. This is the mount point issue #936 exists for: see
 * `toast.store.ts`'s header comment for the measured failure when nothing renders the active toasts.
 *
 * The cart is hydrated once, on mount: the Angular `CartService` did it in its constructor, i.e. the
 * first time anything injected it (the header does, on every page), so the header's bag badge is
 * right from the first screen rather than waiting for a visitor to open `/cart`.
 */
export function MainLayout({ children }: { children: ReactNode }) {
  const layout = layoutFlagsFor(usePathname());

  useEffect(() => {
    if (cartHydrationStarted || useCartStore.getState().hydrated) return;
    cartHydrationStarted = true;
    void useCartStore.getState().hydrate();
  }, []);

  return (
    // A column the height of the screen, with <main> taking the slack: on a short page (About,
    // an empty search) the footer rests at the bottom of the screen instead of floating above a
    // strip of page background, which a footer this small would otherwise do.
    <div className="flex min-h-dvh flex-col">
      {/*
        Keeps the "where did the visitor come from" store (BackLink, RecordLink, ClickableRow) equal
        to the address bar. It calls useSearchParams(), hence its own boundary: see
        use-navigation-origin.ts for why that cost is paid here once rather than in every consumer.
      */}
      <Suspense fallback={null}>
        <NavigationOriginTracker />
      </Suspense>

      {/*
        The wrapper div is deliberate and load-bearing for fidelity. In the Angular app the
        `<app-header>` host element was exactly as tall as the `<header class="sticky top-0">` inside
        it, so the sticky box had no room to travel and the header scrolled away with the page
        (measured: header top 0 -> -700 after scrolling 700px, in both the 1440 and 390 layouts).
        This wrapper reproduces that containing block. Remove it, and the header really sticks.
      */}
      {!layout.hideHeader ? (
        <div>
          <Header />
        </div>
      ) : null}

      {/*
        overflow-x-clip, not -hidden: it clips without making <main> a scroll container, so sticky
        children keep working. A lit button's glow canvas overhangs the button by 24px, which on a
        full-width button (cart, checkout, log in) is 8px past a 16px gutter -- enough to make the
        whole page scroll sideways on a phone.
      */}
      <main id="main" tabIndex={-1} className="min-h-[60vh] flex-1 overflow-x-clip">
        {children}
      </main>

      {!layout.hideFooter ? (
        <>
          <Footer />
          {/* Room for the fixed bottom bar, so it never covers the last line of the footer. */}
          <div aria-hidden="true" className="h-(--bottom-bar-height) md:hidden"></div>
          <BottomBar />
        </>
      ) : null}

      <ToastHost />

      {environment.debug && usingFixtures && !layout.hideFixtureBadge ? (
        // Below `lg` a page can pin an action bar ([data-action-bar]: the cart's Checkout,
        // checkout's Place order) to the same corner this badge sits in, and the badge then covers
        // the button's label. The badge is a developer note, so it steps aside there; `:has` lets
        // a page opt in without this shell knowing which routes have a bar.
        <p
          className="pointer-events-none fixed bottom-[calc(var(--bottom-bar-height)+0.75rem)] right-3 z-50 rounded-full md:bottom-3 bg-warning/90 px-3 py-1 text-xs font-medium text-black shadow-lg max-lg:[body:has([data-action-bar])_&]:hidden"
          role="status"
        >
          Fixture data — no API configured
        </p>
      ) : null}
    </div>
  );
}
