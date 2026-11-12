'use client';

import { useMemo } from 'react';

/** A page number, or an ellipsis gap on one side of the current page. */
type PageToken =
  | { readonly kind: 'page'; readonly page: number }
  | { readonly kind: 'ellipsis'; readonly side: 'start' | 'end' };

/** How many pages to show on each side of the current one, before an ellipsis takes over. */
const WINDOW_SIZE = 1;

const STEP_CLASSES =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm hover:bg-black/5 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export interface PaginationProps {
  totalPages: number;
  currentPage?: number;
  ariaLabel?: string;
  /**
   * Fill of the current page: the brand green by default, or near-black ink
   * for a page drawn in the neutral palette (the shop), where green would be
   * the only colour on screen.
   */
  tone?: 'primary' | 'ink';
  onPageChange?: (page: number) => void;
}

function buildTokens(total: number, current: number): readonly PageToken[] {
  if (total <= 0) return [];

  const first = 1;
  const last = total;
  let windowStart = Math.max(first + 1, current - WINDOW_SIZE);
  let windowEnd = Math.min(last - 1, current + WINDOW_SIZE);

  // An ellipsis that would stand for exactly one hidden page saves nothing over just
  // showing that page, so the window absorbs it instead of collapsing it.
  if (windowStart === first + 2) windowStart = first + 1;
  if (windowEnd === last - 2) windowEnd = last - 1;

  const tokens: PageToken[] = [{ kind: 'page', page: first }];

  if (windowStart > first + 1) {
    tokens.push({ kind: 'ellipsis', side: 'start' });
  }
  for (let page = windowStart; page <= windowEnd; page++) {
    if (page > first && page < last) tokens.push({ kind: 'page', page });
  }
  if (windowEnd < last - 1) {
    tokens.push({ kind: 'ellipsis', side: 'end' });
  }
  if (last > first) {
    tokens.push({ kind: 'page', page: last });
  }

  return tokens;
}

function tokenKey(token: PageToken): string {
  return token.kind === 'page' ? `page-${token.page}` : `ellipsis-${token.side}`;
}

/**
 * A numbered pager: first page, a window around the current page, last page, with an ellipsis
 * filling any gap. Built as a union-tagged token list rather than raw numbers so the list `key`
 * has something stable to key on even though two ellipses can appear in the same render (`side`
 * disambiguates them; two bare `'…'` strings would collide).
 *
 * `noUncheckedIndexedAccess` is why the tokens are built by pushing onto an array rather than by
 * indexing into one — every value the loop touches comes from a local variable computed by
 * arithmetic, never from reading a token, a page number, or an array slot back out by index. There
 * is nothing here for that flag to attach `| undefined` to.
 *
 * Keyboard contract: every page number and both prev/next controls are native `<button>`s, so Tab
 * order and Enter/Space activation are inherited rather than reimplemented. `aria-current="page"`
 * marks the active page for assistive tech without changing focus behaviour.
 */
export function Pagination({
  totalPages,
  currentPage = 1,
  ariaLabel = 'Pagination',
  tone = 'primary',
  onPageChange,
}: PaginationProps) {
  const tokens = useMemo(() => buildTokens(totalPages, currentPage), [totalPages, currentPage]);

  const pageClasses = (page: number): string => {
    const base =
      'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
    if (page !== currentPage) return `${base} hover:bg-black/5`;
    return tone === 'ink'
      ? `${base} bg-(--color-rail-fg) text-(--color-rail-bg)`
      : `${base} bg-primary text-white`;
  };

  const goTo = (page: number): void => {
    const clamped = Math.min(Math.max(page, 1), totalPages);
    if (clamped !== currentPage) onPageChange?.(clamped);
  };

  return (
    <nav aria-label={ariaLabel} className="flex items-center gap-1">
      <button
        type="button"
        className={STEP_CLASSES}
        disabled={currentPage <= 1}
        onClick={() => goTo(currentPage - 1)}
        aria-label="Previous page"
      >
        ‹
      </button>

      {tokens.map((token) =>
        token.kind === 'ellipsis' ? (
          <span key={tokenKey(token)} className="px-2 text-[--color-text-muted]" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={tokenKey(token)}
            type="button"
            className={pageClasses(token.page)}
            aria-current={token.page === currentPage ? 'page' : undefined}
            onClick={() => goTo(token.page)}
          >
            {token.page}
          </button>
        ),
      )}

      <button
        type="button"
        className={STEP_CLASSES}
        disabled={currentPage >= totalPages}
        onClick={() => goTo(currentPage + 1)}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}
