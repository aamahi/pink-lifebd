import Link from 'next/link';

import { routeToHref, withQuery, type QueryParams, type RouteTarget } from './route-href';

export interface RowLinkOverlayProps {
  route: RouteTarget;
  queryParams?: QueryParams;
}

/**
 * The real `<a>` that `ClickableRow` stretches over a row (the "stretched-link" pattern). Kept as
 * its own tiny component, rather than a click handler on the row, so it is a genuine link -- real
 * `href`, real ctrl/cmd/middle-click, real "copy link address" -- instead of a hand-rolled
 * click/keydown listener that would have to reimplement all of that.
 *
 * The outer span is the Angular host element's classes (`absolute inset-0 block
 * pointer-events-none`): the wrapper covers the row but lets clicks fall through to whatever is
 * beneath, and only the inner anchor takes them.
 */
export function RowLinkOverlay({ route, queryParams }: RowLinkOverlayProps) {
  return (
    <span className="absolute inset-0 block pointer-events-none">
      <Link
        className="pointer-events-auto absolute inset-0 z-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        href={withQuery(routeToHref(route), queryParams)}
        title="View"
        tabIndex={0}
      />
    </span>
  );
}
