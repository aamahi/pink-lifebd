'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { useNavigationOrigin } from './use-navigation-origin';
import type { RouteTarget } from './route-href';

export interface RecordLinkProps {
  /**
   * Router commands for the target record's page (`['/product', slug]`), a plain path, or `null`
   * when this reference has no page to open.
   */
  route: RouteTarget | null;
  /** Optional permission-style hook -- see the doc below. Defaults to always allowed. */
  permitted?: () => boolean;
  /** Classes for the wrapper (the Angular `<app-record-link class="...">` host). */
  className?: string;
  children?: ReactNode;
}

/**
 * The one building block for "a reference to a record that has its own page" (an order number, a
 * customer name, a product name). Wherever such a value is rendered, it renders this component
 * instead of a hand-rolled `<Link>`, an `onClick={() => viewX(id)}` button, or plain text.
 *
 * What it gives for free:
 * - a real `<a>` element -- same-tab click, ctrl/cmd/middle-click new tab, "copy link address",
 *   hover preview;
 * - the current page's url attached as `returnTo`, so Back from the target returns to this exact
 *   view -- the same origin mechanism `BackLink` uses, reused rather than reimplemented;
 * - a gate: `route === null` (a walk-in customer with no profile, a record already deleted, a
 *   viewer who cannot open it) renders plain text instead of a link that would then error or 403.
 *
 * Admin's copy of this file also gates on a `PermissionService` lookup -- this template ships no
 * permission system, so that gate is generalised into an optional `permitted` predicate. A fork that
 * adds real per-viewer permissions supplies `permitted={() => can(...)}`; a caller that has nothing
 * to check leaves it at its default (always allowed) and the `route === null` gate above still holds.
 *
 * The Angular version routed one projected `<ng-content>` through an `<ng-template>` so both
 * branches could show it; JSX has no such limit, so `children` is simply used in whichever branch
 * renders.
 */
export function RecordLink({ route, permitted, className, children }: RecordLinkProps) {
  const { withOrigin } = useNavigationOrigin();
  const canLink = route !== null && (permitted ? permitted() : true);

  const inner = canLink ? (
    <Link className="text-primary no-underline hover:underline" href={withOrigin(route)}>
      {children}
    </Link>
  ) : (
    <span>{children}</span>
  );

  return className ? <span className={className}>{inner}</span> : inner;
}
