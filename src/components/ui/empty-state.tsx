import type { HTMLAttributes } from 'react';
import { cn } from '@/core/utils/cn';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: string;
  hint?: string;
}

/**
 * The "nothing here" panel -- and it is NOT the error panel.
 *
 * Zero results and a failed request are different facts and must not share a
 * component, because the moment they do, a caller renders this on a caught error and
 * the page tells the user their search matched nothing when the truth is that the
 * API never answered. `<Alert tone="danger">` / `<ErrorState>` is the failure surface.
 */
export function EmptyState({ title, hint = '', className, children, ...rest }: EmptyStateProps) {
  return (
    <div
      {...rest}
      className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}
    >
      <p className="text-base font-medium text-(--color-text)">{title}</p>
      {hint ? <p className="mt-1 max-w-prose text-sm text-(--color-text-muted)">{hint}</p> : null}
      <div className="mt-4 empty:hidden">{children}</div>
    </div>
  );
}
