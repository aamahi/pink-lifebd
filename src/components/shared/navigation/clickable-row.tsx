'use client';

import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from 'react';

import { cn } from '@/core/utils/cn';
import { RowLinkOverlay } from './row-link-overlay';
import type { RouteTarget } from './route-href';
import { useNavigationOrigin } from './use-navigation-origin';

/**
 * The one shared building block for "a list row whose record has its own page opens it on click".
 *
 * Wrap the row (`<ClickableRow as="li" route={['/account/portal/orders', order.id]}>`). It
 * stretches a real anchor (`RowLinkOverlay`) over the row rather than attaching an `onClick` that
 * calls the router -- a click handler cannot give ctrl/cmd/middle-click or "copy link address",
 * which this gets for free by using an actual `<a>`.
 *
 * Inner interactive elements (a record-link, an action button, a checkbox) keep working because they
 * render above the overlay: the overlay is the row's LAST child with `position: absolute; z-index: 0`,
 * so give each inner control `relative z-10` (the product card's heart does) and the browser's
 * hit-testing resolves a click on it to itself, not to the overlay anchor sitting underneath. The
 * Angular directive's doc called this a `row-action` class; no stylesheet in the app ever defined
 * one, so the utilities are named directly instead.
 *
 * `route` accepts `null`/`undefined` for "this row has no page to open" -- no overlay is created and
 * the row is not clickable. The row must be `position: relative` for the absolutely positioned
 * overlay to size against it; this sets that itself (inline, as the directive did) so a consumer
 * never has to remember it.
 *
 * Admin's copy also gates on a `PermissionService` lookup -- this template ships no permission
 * system, so that gate is generalised into an optional `allowed` predicate (the directive's
 * `clickableRowAllowed`), mirroring `RecordLink.permitted`. Defaults to always allowed.
 *
 * `as` picks the element (default `div`; `li`, `article`, ...) or a component that forwards
 * `className`, `style` and `children` (`as={Card}`). Everything else is passed through to it.
 */
export type ClickableRowProps<T extends ElementType = 'div'> = {
  /** Which element (or component) is the row. Default `'div'`. */
  as?: T;
  /** Router commands to the row's record page, a plain path, or `null`/`undefined` when it has none. */
  route?: RouteTarget | null;
  /** Optional permission-style hook -- same contract as `RecordLink.permitted`. */
  allowed?: () => boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Omit<
  ComponentPropsWithoutRef<T>,
  'as' | 'route' | 'allowed' | 'className' | 'style' | 'children'
>;

/**
 * The pieces a row needs, for a host that cannot be rendered through `ClickableRow`'s `as`:
 * spread `className`/`style` onto the row and render `overlay` as its last child. `clickable` is
 * false when `route` is empty or `allowed()` says no -- in which case all three are inert.
 */
export function useClickableRow(
  route: RouteTarget | null | undefined,
  allowed?: () => boolean,
): {
  clickable: boolean;
  className: string;
  style: CSSProperties | undefined;
  overlay: ReactNode;
} {
  const { originQueryParams } = useNavigationOrigin();
  const clickable = !!route && (allowed ? allowed() : true);
  return {
    clickable,
    className: clickable ? 'is-clickable-row' : '',
    style: clickable ? { position: 'relative' } : undefined,
    overlay:
      clickable && route ? (
        <RowLinkOverlay route={route} queryParams={originQueryParams()} />
      ) : null,
  };
}

export function ClickableRow<T extends ElementType = 'div'>({
  as,
  route,
  allowed,
  className,
  style,
  children,
  ...rest
}: ClickableRowProps<T>) {
  const Tag: ElementType = as ?? 'div';
  const row = useClickableRow(route, allowed);

  return (
    <Tag
      {...rest}
      className={cn(className, row.className) || undefined}
      style={row.style ? { ...style, ...row.style } : style}
    >
      {children}
      {row.overlay}
    </Tag>
  );
}
