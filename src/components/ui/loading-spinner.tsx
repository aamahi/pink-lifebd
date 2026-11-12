import { cn } from '@/core/utils/cn';

export interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

/**
 * The LOADING branch's active-request indicator — distinct from `<Skeleton>`, which shapes the
 * region a page is about to fill. This is for a spot that has no shape to preview (a button mid
 * submit, a toolbar action in flight).
 *
 * `role="status"` is a live region, not a widget: it has nothing to press and nothing to tab to,
 * so it carries no keyboard contract to implement — the ring is `aria-hidden`, and the accessible
 * announcement comes from the message text (or the `sr-only` fallback when none is given), read
 * once by assistive tech when the region appears.
 */
export function LoadingSpinner({ message = '', className }: LoadingSpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2', className)}>
      <span
        className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent text-primary"
        aria-hidden="true"
      ></span>
      {message ? (
        <span className="text-sm text-[--color-text-muted]">{message}</span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </span>
  );
}
