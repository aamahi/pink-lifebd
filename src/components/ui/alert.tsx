import type { HTMLAttributes } from 'react';
import { cn } from '@/core/utils/cn';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<AlertTone, string> = {
  info: 'border-primary/30 bg-primary/5 text-(--color-text)',
  success: 'border-success/30 bg-success/5 text-(--color-text)',
  warning: 'border-warning/40 bg-warning/5 text-(--color-text)',
  danger: 'border-danger/40 bg-danger/5 text-(--color-text)',
};

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: AlertTone;
  title?: string;
}

/**
 * The failure and notice surface.
 *
 * `role` is tone-dependent on purpose: `alert` is assertive and interrupts whatever
 * a screen reader is saying, which is right for a failed submit and rude for a
 * success toast. Everything non-danger gets the polite `status` role.
 *
 * One element carries both the role and the surface classes (the Angular version split them
 * across a `<ui-alert>` host and an inner div). A caller's `className` / `id` land on it, which is
 * where the host's `class="mt-4 block"` and `id="order-error"` landed before.
 */
export function Alert({ tone = 'info', title = '', className, children, ...rest }: AlertProps) {
  return (
    <div
      {...rest}
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-md border px-4 py-3', TONES[tone], className)}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <div className="text-sm">{children}</div>
    </div>
  );
}
