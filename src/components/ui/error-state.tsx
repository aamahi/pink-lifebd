'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/core/utils/cn';
import { Button } from './button';

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: string;
  message?: string;
  /** Empty string hides the retry control -- a caller with no retry path passes ''. */
  retryLabel?: string;
  onRetry?: () => void;
}

/**
 * The FAILED branch's mounted surface, with a retry action — the component the source repos
 * never had. Those repos carry CSS classes only (`.error-banner`, `.field-error`), styling
 * conventions with no shared component behind them, so every caller re-typed the same markup and
 * some of them, per `.claude/rules/engineering-conventions.md` rule 4, routed a failed request
 * into the SAME markup as an empty result. This component and `<EmptyState>` are deliberately
 * two different files for that reason — see `empty-state.tsx`'s own comment.
 *
 * `role="alert"` is assertive on purpose: a failed request is the one state in the four-branch
 * set (`.claude/rules/engineering-conventions.md` rule 4) that should interrupt, the same
 * reasoning `alert.tsx` uses for its `danger` tone. The retry control is `<Button>`, a native
 * `<button>`, so Enter/Space activation is inherited rather than reimplemented — nothing about
 * `role="alert"` itself carries a keyboard contract; it is an announcement role, not a widget role.
 */
export function ErrorState({
  title = 'Something went wrong',
  message = '',
  retryLabel = 'Try again',
  onRetry,
  className,
  ...rest
}: ErrorStateProps) {
  return (
    <div
      {...rest}
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <p className="text-base font-medium text-(--color-text)">{title}</p>
      {message ? <p className="max-w-prose text-sm text-(--color-text-muted)">{message}</p> : null}
      {retryLabel ? (
        <Button type="button" variant="dark" size="sm" onClick={() => onRetry?.()}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
