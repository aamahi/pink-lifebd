/**
 * Turns Angular-style `routerLink` commands into the `href` string `next/link` wants.
 *
 * The Angular components took `route: Array<string | number>` (`['/product', slug]`) and let the
 * router build the URL, encoding each segment. This does the same, so a consumer porting
 * `[routerLink]="['/product', p.slug]"` passes the identical array. A plain string is also accepted
 * and used as the path as-is.
 */

/** RouterLink commands: the first entry is the (absolute) base path, the rest are path segments. */
export type RouteCommands = readonly (string | number)[];
/** Anything the navigation components accept as a destination. */
export type RouteTarget = string | RouteCommands;
/** Query params; `null`/`undefined` entries are dropped, the way Angular drops them. */
export type QueryParams = Readonly<Record<string, string | number | boolean | null | undefined>>;

/**
 * `['/account/portal/orders', 'order 1']` -> `/account/portal/orders/order%201`.
 *
 * Every command after the first is URL-encoded as ONE segment (so an id containing `/` or `?` cannot
 * change which page the link opens); the first is taken as a path and left alone, as the router
 * does with a command such as `'/account/portal/orders'`.
 */
export function routeToHref(route: RouteTarget): string {
  if (typeof route === 'string') return route;
  const [head = '', ...rest] = route.map(String);
  const path = [head.replace(/\/+$/, ''), ...rest.map(encodeURIComponent)].join('/');
  return path.startsWith('/') ? path : `/${path}`;
}

/** `{ a: '1', b: null }` -> `a=1`. No leading `?`. */
export function buildQueryString(params?: QueryParams): string {
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) search.set(key, String(value));
    }
  }
  return search.toString();
}

/**
 * Adds `params` to `href`, keeping any query string `href` already has (a later value for the same
 * key wins). A `#fragment` stays at the end.
 */
export function withQuery(href: string, params?: QueryParams): string {
  if (!params) return href;
  const hashAt = href.indexOf('#');
  const hash = hashAt === -1 ? '' : href.slice(hashAt);
  const beforeHash = hashAt === -1 ? href : href.slice(0, hashAt);
  const qAt = beforeHash.indexOf('?');
  const path = qAt === -1 ? beforeHash : beforeHash.slice(0, qAt);
  const merged = new URLSearchParams(qAt === -1 ? '' : beforeHash.slice(qAt + 1));
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) merged.set(key, String(value));
  }
  const query = merged.toString();
  return `${path}${query ? `?${query}` : ''}${hash}`;
}
