/**
 * Merge-writes query params into the address bar, synchronously.
 *
 * Port of the Angular `RouteNavigateSerializer`, which existed because `router.navigate([], {
 * queryParamsHandling: 'merge' })` computes its target from `currentUrlTree`, and that tree only
 * updates once a navigation COMMITS. Two merge navigations fired back-to-back from independent call
 * sites raced: the second's merge was computed against the stale pre-first-navigation tree and
 * silently dropped the first call's params. The Angular fix was a shared promise chain.
 *
 * This version has no such race to chain around. It merges against `window.location.search` --
 * the live address, which `history.replaceState` updates synchronously -- so a second call always
 * sees the first call's params. Next integrates native `history.replaceState` calls into the
 * router (documented: "Window History API"), so `useSearchParams()` / `usePathname()` re-render
 * from it with no server round trip, no RSC refetch and no scroll reset -- the equivalent of the
 * Angular `scroll: 'manual'` opt-out, which existed because the router's scroll-to-top otherwise
 * answered a view-state write by jumping the visitor to the top of the page they were filtering.
 *
 * Why not `router.replace(...)`: it is asynchronous (a transition), so a controlled filter input
 * whose value came back from the URL would lag a keystroke behind, and the merge-race above would
 * come back with it.
 */

/** `null` removes the param (the field is at a value that does not belong in the URL). */
export type QueryUpdates = Readonly<Record<string, string | null>>;

/**
 * Applies `updates` to the current address with `history.replaceState` and returns the resulting
 * search string (no leading `?`, in `URLSearchParams.toString()` form). Browser-only: call it from
 * an event handler or an effect, never during render.
 */
export function replaceQuery(updates: QueryUpdates): string {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  const search = params.toString();
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
  );
  return search;
}
