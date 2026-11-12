import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/core/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  interactive?: boolean;
  /** The `[card-header]` slot. */
  cardHeader?: ReactNode;
  /** The `[card-footer]` slot. */
  cardFooter?: ReactNode;
}

/**
 * A surface. Content is projected into three optional slots so a card's header and
 * footer keep consistent padding without every caller re-typing it.
 *
 * `<Card cardHeader={…} cardFooter={…}>…body…</Card>`
 *
 * The header and footer wrappers render whether or not a slot is given, exactly as the Angular
 * template did (an unprojected `<ng-content>` still leaves its bordered wrapper behind).
 *
 * The surface IS the root element: a caller's `className` and native props (an `id`, a data
 * attribute, a pointer handler) land on it, where the `<ui-card>` host's did.
 */
export function Card({
  padded = true,
  interactive = false,
  cardHeader,
  cardFooter,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      {...rest}
      className={cn(
        'overflow-hidden rounded-lg border border-(--color-border)',
        'bg-(--color-surface-raised) shadow-(--shadow-card)',
        interactive
          ? 'transition-shadow hover:shadow-lg focus-within:ring-2 focus-within:ring-primary'
          : '',
        className,
      )}
    >
      <div className="border-b border-(--color-border) px-4 py-3">{cardHeader}</div>
      <div className={padded ? 'p-4' : ''}>{children}</div>
      <div className="border-t border-(--color-border) px-4 py-3">{cardFooter}</div>
    </div>
  );
}
