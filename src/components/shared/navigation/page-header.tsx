import type { ReactNode } from 'react';

import { BackLink } from './back-link';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /**
   * This page's own section-list route, for when it is opened with no `returnTo` -- e.g. a detail
   * page passes `/account/portal/orders`, never some other section's route. Omit entirely for a
   * top-level, nav-reachable page: no Back control renders.
   */
  backTo?: string;
  /** `'icon-label'` (default) or `'icon-only'` -- forwarded to `BackLink`. */
  backVariant?: 'icon-label' | 'icon-only';
  /**
   * Forwarded to `BackLink`'s `label` -- `'Back'` on a detail/list page, `'Cancel'` on a
   * create/edit form leaving without saving. Same control either way: only the word changes to
   * match what the reader is doing.
   */
  backLabel?: string;
  /** An icon or badge before the title. */
  leading?: ReactNode;
  /** After the title. */
  badge?: ReactNode;
  /** An inline surface switcher beside the title. */
  tabs?: ReactNode;
  /** Right-aligned. */
  search?: ReactNode;
  /** Right-aligned, after `search`. */
  actions?: ReactNode;
}

/**
 * The shared page-header shell. `backTo` omitted (the default) means a top-level, nav-reachable
 * page and renders no Back control; a page one level down passes its own section-list route as
 * `backTo`, and `BackLink` honours an in-app `returnTo` over it when one is present.
 *
 * Slots: `leading` (an icon or badge before the title), `badge` (after the title), `tabs` (an inline
 * surface switcher beside the title), `search` and `actions` (right-aligned).
 *
 * The `[&:empty]:hidden` wrappers are the Angular template's way of collapsing an unused slot; they
 * still work because React renders a `null` slot as an element with no children at all.
 */
export function PageHeader({
  title,
  subtitle = '',
  backTo,
  backVariant = 'icon-label',
  backLabel = 'Back',
  leading,
  badge,
  tabs,
  search,
  actions,
}: PageHeaderProps) {
  return (
    <div className="border-b border-[--color-border] px-3.5 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-2">
              {backTo !== undefined ? (
                <BackLink
                  className="shrink-0"
                  fallback={backTo}
                  variant={backVariant}
                  label={backLabel}
                />
              ) : null}
              <div className="inline-flex items-center [&:empty]:hidden">{leading}</div>
              <h1 className="m-0 text-[length:--font-size-page-title,1.5rem] font-bold tracking-tight text-[--color-text]">
                {title}
              </h1>
              <span className="[&:empty]:hidden">{badge}</span>
            </div>
            {subtitle ? (
              <p className="m-0 text-sm tracking-wide text-[--color-text-muted]">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex min-w-0 items-center [&:empty]:hidden">{tabs}</div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {search}
          <div className="flex items-center gap-1.5">{actions}</div>
        </div>
      </div>
    </div>
  );
}
