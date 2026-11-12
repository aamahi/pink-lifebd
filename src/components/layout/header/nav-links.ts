/**
 * The single declared-route nav list, imported by every layout component that renders a link to one
 * of these destinations: `header.tsx` (desktop nav), `mobile-drawer.tsx` (the same set, mobile
 * layout) and `footer.tsx` (the "Shop" column). One array rather than one per component is what
 * keeps them from drifting apart.
 *
 * This is the failure ticket #937 names by file and line: `demo-storefront`'s `header.ts:37-80`
 * hardcoded 17 nav paths under `/shop/**` plus `/cart` and `/account` against an `app.routes.ts`
 * that declared four routes -- so all 20 fell through to the wildcard and rendered the 404 with no
 * error anywhere. A shared list is the fix: a path added here that no `src/app/**` route serves is
 * one edit to find, rather than three lists to compare in a browser nobody is looking at.
 */
export interface NavLink {
  readonly path: string;
  readonly label: string;
}

/**
 * A link into a page with filters already set (the header's collections,
 * the footer's categories and sorts): a declared route, plus the shop filter it opens with when it
 * is one. `query` is null for a plain page.
 */
export interface FilterLink extends NavLink {
  readonly query: Readonly<Record<string, string>> | null;
}

/** Primary nav: header desktop bar, header mobile drawer, footer "Shop" column. */
export const NAV_LINKS: readonly NavLink[] = [
  { path: '/', label: 'Home' },
  { path: '/shop', label: 'Shop' },
  { path: '/about-us', label: 'About Us' },
  { path: '/contact-us', label: 'Contact' },
] as const;

/**
 * Desktop header menu, from Figma node 15:62. Each entry opens the shop
 * showing only that collection -- a product tag, see `SHOP_COLLECTIONS` in
 * `features/catalog/shop-filter.ts`. `header.tsx` underlines the entry whose
 * collection is the one in the URL.
 */
export const HEADER_MENU_LINKS: readonly FilterLink[] = [
  { path: '/shop', label: 'Bras', query: { collection: 'bras' } },
  { path: '/shop', label: 'Panties', query: { collection: 'panties' } },
  { path: '/shop', label: 'Nightwear', query: { collection: 'nightwear' } },
  { path: '/shop', label: 'New Collections', query: { collection: 'new' } },
] as const;

/**
 * The mobile bottom bar carries a shorter, task-oriented set -- the reason
 * this is a second list rather than a slice of `NAV_LINKS`: the two are
 * allowed to diverge in count and this keeps that divergence explicit instead
 * of implicit in a `.slice(0, 3)` some future edit to `NAV_LINKS` would
 * silently break.
 *
 * `Cart` and `Account` are shard 3B's addition, now that `/cart` and
 * `/account/portal` exist -- `Account` points at the portal rather than
 * `/account/login`, because the portal's auth guard
 * (`features/account/portal/auth.guard.tsx`) already redirects an
 * unauthenticated visitor to the login screen; pointing this link at the
 * login form directly would skip that redirect happening for real where a
 * demo author can see it.
 */
export const BOTTOM_BAR_LINKS: readonly NavLink[] = [
  { path: '/', label: 'Home' },
  { path: '/shop', label: 'Shop' },
  { path: '/cart', label: 'Cart' },
  { path: '/account/portal', label: 'Account' },
] as const;

/*
 * The footer's links -- one short row: the shop's categories, then the three pages a shopper looks
 * for at the bottom of a page. The header, the bottom bar and the shop's own sort carry the rest.
 * One flat array. Every path is a route `src/app` serves; category links open `/shop` with that
 * filter set in the URL.
 */
export const FOOTER_LINKS: readonly FilterLink[] = [
  { path: '/shop', label: 'Bras', query: { category: 'bras' } },
  { path: '/shop', label: 'Panties', query: { category: 'panties' } },
  { path: '/shop', label: 'Nightwear', query: { category: 'nightwear' } },
  { path: '/shop', label: 'Accessories', query: { category: 'accessories' } },
  { path: '/about-us', label: 'About Us', query: null },
  { path: '/contact-us', label: 'Contact Us', query: null },
  { path: '/privacy-policy', label: 'Privacy Policy', query: null },
] as const;

/**
 * `href` for a link that may carry a filter: `/shop` + `{ collection: 'bras' }` ->
 * `/shop?collection=bras`.
 */
export function filterLinkHref(link: NavLink & { readonly query?: FilterLink['query'] }): string {
  if (!link.query) return link.path;
  const search = new URLSearchParams(link.query).toString();
  return search ? `${link.path}?${search}` : link.path;
}

/**
 * Whether `link` is the current page, for `routerLinkActive="text-primary"`.
 *
 * `exact` (the Angular `{ exact: true }`) requires the same path. Otherwise the path matches itself
 * or anything beneath it, by whole segments: `/account/portal` is current on
 * `/account/portal/orders`, but `/shop` is not current on `/shopping`. The Angular option's
 * `queryParams: 'subset'` half is not needed here -- these links carry no query.
 */
export function isLinkActive(linkPath: string, pathname: string, exact: boolean): boolean {
  const here = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (exact) return here === linkPath;
  return here === linkPath || here.startsWith(`${linkPath}/`);
}
