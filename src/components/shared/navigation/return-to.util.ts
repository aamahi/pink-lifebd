/**
 * Validates a `returnTo` query param before it is handed to a navigation.
 *
 * `router.push` accepts anything that parses as a URL, so an absolute path is not enough on its own:
 * `//evil.com` and `https://evil.com` both parse and both leave the app's origin. Returns `null` for
 * anything that is not a same-origin, absolute internal path, so a stale, truncated, or malformed
 * value can be told apart from a legitimate one instead of falling through to the 404 page.
 *
 * Any backslash rejects the whole value, not just a leading `/\`. WHATWG URL
 * parsing treats `\` as equivalent to `/` in the authority position, so
 * `/\evil.com` and `/\\evil.com` reach the same off-origin host as
 * `//evil.com` while passing a `startsWith('//')` check. An internal route in
 * this app never contains one, so rejecting outright costs nothing and needs
 * no per-position reasoning about where the authority begins.
 */
export function normalizeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/')) return null;
  if (value.startsWith('//') || value.includes('://') || value.includes('\\')) return null;
  return value;
}

/** The slice of Next's `useRouter()` this helper needs. */
export interface PushRouter {
  push(href: string): void;
}

/**
 * Navigates to `target`, falling back to `fallback` when it is not a valid same-origin internal
 * path.
 *
 * `target` is validated by `normalizeReturnTo` AND by parsing it against a throwaway origin and
 * checking it did not leave it -- `new URL` normalises some inputs (tabs, newlines, repeated
 * slashes) into a different authority than a prefix test sees.
 *
 * Deviation from the Angular helper: `router.navigateByUrl` resolved to `false` when the navigation
 * was rejected (a guard, an unmatched route) and the helper then fell back. Next's `router.push`
 * returns nothing, so only the up-front validation half survives; an unmatched route renders the
 * app's 404 page instead of redirecting to `fallback`.
 */
export function safeNavigateByUrl(router: PushRouter, target: string, fallback: string): void {
  const probe = 'http://internal.invalid';
  let valid = false;
  if (normalizeReturnTo(target) !== null) {
    try {
      valid = new URL(target, probe).origin === probe;
    } catch {
      valid = false;
    }
  }
  if (valid) {
    router.push(target);
    return;
  }
  if (target !== fallback) router.push(fallback);
}
