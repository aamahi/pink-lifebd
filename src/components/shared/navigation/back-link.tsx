'use client';

import Link from 'next/link';

import { Icon } from '../icons/icon';
import { useNavigationOrigin } from './use-navigation-origin';

export interface BackLinkProps {
  /** This page's own section-list route; omit entirely for a top-level page. */
  fallback?: string;
  /** `'icon-label'` (default) or `'icon-only'`. */
  variant?: 'icon-label' | 'icon-only';
  /** Overrides the default "Back" label -- e.g. "Cancel" on a create/edit form. */
  label?: string;
  /**
   * Classes for the wrapper element (the Angular `<app-back-link class="...">` host). The host was
   * an inline custom element, so a `block`, `-ml-2.5` or `shrink-0` on it applied to the wrapper and
   * not to the link; the wrapper here is an inline `<span>` for the same reason.
   */
  className?: string;
}

/**
 * The one Back control. Every page that shows a Back or Cancel affordance renders this component
 * rather than its own button plus a `goBack()` method. `PageHeader` uses it internally for the
 * common case; a page with a fully custom header shell can mount it directly so the underlying
 * computation and the real-link behaviour stay shared even where the surrounding chrome is not.
 *
 * Renders a real `<a href>` (via `next/link`), never an `onClick` handler, so ctrl/cmd/middle-click,
 * "copy link address" and the browser's own hover preview all work for free.
 *
 * `fallback`:
 * - a string -- this page's own section-list route, used when no `returnTo` is present. Every
 *   caller supplies its own fallback; there is no shared default, so a page can never silently
 *   inherit another section's destination.
 * - `undefined` (the default) -- this is a top-level, nav-reachable page. No control renders,
 *   regardless of any `returnTo` a crafted URL might carry.
 */
export function BackLink({
  fallback,
  variant = 'icon-label',
  label = 'Back',
  className,
}: BackLinkProps) {
  const href = useNavigationOrigin().resolveBackTarget(fallback);
  if (href === undefined) return null;

  const link = (
    <Link
      className={`inline-flex items-center gap-1.5 rounded-md border border-transparent py-1.5 text-(--color-text) no-underline hover:bg-(--color-surface-sunken) ${
        variant === 'icon-only' ? 'px-1.5' : 'px-2.5'
      }`}
      href={href}
      title={variant === 'icon-only' ? label : undefined}
      aria-label={label}
    >
      <Icon name="arrow-left" size={18} />
      {variant !== 'icon-only' ? <span className="text-sm font-semibold">{label}</span> : null}
    </Link>
  );

  return className ? <span className={className}>{link}</span> : link;
}
