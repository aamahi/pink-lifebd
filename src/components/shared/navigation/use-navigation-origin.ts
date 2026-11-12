'use client';

import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { normalizeReturnTo } from './return-to.util';
import { routeToHref, withQuery, type QueryParams, type RouteTarget } from './route-href';

/**
 * One idea underlies the whole navigation contract: since list-view state lives in the address
 * (see `use-route-view-state.ts`), "return to where the user came from, with that page's filters
 * intact" is the SAME problem as "navigate back to the exact URL the user was on." There is only
 * one thing to carry, and it is the current URL.
 *
 * This module is the ONE place that reads or writes the `returnTo` query param. A page never
 * builds one by hand -- it asks `useNavigationOrigin()` for a link's href (`withOrigin`) or a back
 * target (`resolveBackTarget`), and gets the validated, current-URL-based answer for free.
 *
 * Port of the Angular `NavigationOriginService`, which read `Router.url` and the activated route's
 * `queryParamMap`. Neither exists here: the current URL lives in a tiny module-level store that
 * `<NavigationOriginTracker />` (mounted once, by `MainLayout`) keeps in sync with
 * `usePathname()` + `useSearchParams()`. Reading it through `useSyncExternalStore` instead of
 * calling `useSearchParams()` in every consumer is deliberate: `useSearchParams()` forces the
 * nearest `<Suspense>` boundary to client-render on a statically prerendered page, and a card, a
 * record link or a Back control appears on nearly every page -- each would otherwise need its own
 * boundary or `next build` fails with "Missing Suspense boundary with useSearchParams". Only the
 * tracker pays that cost, once, behind its own boundary.
 *
 * The store is empty on the server and for the very first client render, so a link rendered then
 * has no `returnTo` and a Back control shows its section fallback; the tracker fills the store in a
 * layout effect (before the browser paints) and every consumer re-renders with the real value.
 */

/** The one query-param name every part of this mechanism reads and writes. */
export const ORIGIN_PARAM = 'returnTo' as const;

let currentUrl = '';
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
const getSnapshot = (): string => currentUrl;
const getServerSnapshot = (): string => '';

/** The URL (path + query, no hash) the store currently holds. `''` until the tracker has run. */
export function getCurrentUrl(): string {
  return currentUrl;
}

/** Called by `NavigationOriginTracker`; exported so a test or a non-Next host can drive the store. */
export function setCurrentUrl(url: string): void {
  if (url === currentUrl) return;
  currentUrl = url;
  for (const listener of listeners) listener();
}

/**
 * Keeps the store equal to the address bar. Renders nothing. Mounted once in `MainLayout`, inside
 * a `<Suspense fallback={null}>` (it calls `useSearchParams`).
 */
export function NavigationOriginTracker(): null {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  // A layout effect, not an effect: on a client navigation the new page renders against the OLD
  // URL first, and a Back control that painted once with the previous page's `returnTo` would
  // flash the wrong destination. A layout effect updates the store (and re-renders the consumers)
  // before the browser paints.
  useLayoutEffect(() => {
    setCurrentUrl(search ? `${pathname}?${search}` : pathname);
  }, [pathname, search]);
  return null;
}

/** The validated `returnTo` carried by `url`'s query string, or `null` if absent/unsafe. */
export function originOf(url: string): string | null {
  const qAt = url.indexOf('?');
  if (qAt === -1) return null;
  return normalizeReturnTo(new URLSearchParams(url.slice(qAt + 1)).get(ORIGIN_PARAM));
}

export interface NavigationOrigin {
  /** The current page's own path + query (`/shop?q=lamp`), `''` before the tracker has run. */
  readonly currentUrl: string;

  /**
   * Query params to attach to a link INTO a detail or form page, captured at the moment of
   * linking. The current URL is that page's own view state -- so carrying it forward is
   * simultaneously "remember where I came from" and "remember what it looked like." Nothing else
   * needs to be captured.
   *
   * `extra` merges in caller-supplied params; it is kept for a caller mid-migration to
   * `useRouteViewState`, because a fully migrated list page never needs it.
   */
  originQueryParams(extra?: QueryParams): QueryParams;

  /**
   * `href` (or router commands) with the current page attached as `returnTo`, ready for a
   * `next/link` `href`: `withOrigin(['/product', slug])` ->
   * `/product/lamp?returnTo=%2Fshop%3Fq%3Dlamp`. Any query already on a string `href` is kept.
   */
  withOrigin(target: RouteTarget, extra?: QueryParams): string;

  /**
   * The origin THIS page itself received, as a query-param object ready to forward. Used on save:
   * the newly created/edited record's detail page must inherit the FORM's original origin, not the
   * form's own URL (which is one hop closer to the user than where they actually started).
   */
  forwardedOriginParams(): QueryParams;

  /** The validated `returnTo` this page was opened with, or `null` if absent/unsafe. */
  currentOrigin(): string | null;

  /**
   * Where Back/Cancel on THIS page should go.
   *
   * - No `sectionFallback` (`undefined`) -> this is a top-level page: no control renders,
   *   regardless of any `returnTo` a crafted URL might carry. Top-level-ness is a property of the
   *   PAGE, checked first and unconditionally -- not of the query string a validated origin reads
   *   from, so this branch is decided before `currentOrigin` is even consulted.
   * - A `sectionFallback` was given, and a validated origin is present -- the origin wins.
   * - A `sectionFallback` was given, no origin -- that page's own section list -- NEVER a
   *   different section's page, so every caller must supply its own, and no caller may reuse
   *   another section's constant.
   */
  resolveBackTarget(sectionFallback: string | undefined): string | undefined;
}

export function useNavigationOrigin(): NavigationOrigin {
  const url = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo<NavigationOrigin>(() => {
    const currentOrigin = (): string | null => originOf(url);
    const originQueryParams = (extra?: QueryParams): QueryParams =>
      url ? { ...extra, [ORIGIN_PARAM]: url } : { ...extra };
    return {
      currentUrl: url,
      originQueryParams,
      withOrigin: (target, extra) => withQuery(routeToHref(target), originQueryParams(extra)),
      forwardedOriginParams: () => {
        const origin = currentOrigin();
        return origin ? { [ORIGIN_PARAM]: origin } : {};
      },
      currentOrigin,
      resolveBackTarget: (sectionFallback) => {
        if (sectionFallback === undefined) return undefined;
        return currentOrigin() ?? sectionFallback;
      },
    };
  }, [url]);
}
