'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/core/utils/cn';

/** What a render-prop child receives: wire these onto the control. */
export interface FieldControlProps {
  /** The control's `id`; the label's `for` points at it. */
  readonly id: string;
  /** Bind to the control's `aria-describedby`. `undefined` when there is no error or hint. */
  readonly describedBy: string | undefined;
  /** Bind to the control's `aria-invalid`: true exactly when an error is showing. */
  readonly invalid: boolean;
}

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** A render function receiving `{ id, describedBy, invalid }`, or plain nodes. */
  children?: ReactNode | ((control: FieldControlProps) => ReactNode);
}

/**
 * Label + control + error, wired together.
 *
 * The wiring is the reason this exists rather than each form re-typing a label and a
 * red paragraph: `for`/`id`, `aria-describedby` and `aria-invalid` have to agree or
 * the error is invisible to a screen reader while being perfectly visible on screen.
 * That is a failure nobody catches by looking at the page.
 *
 * The control is passed in, so this component never wraps or re-implements an input
 * and stays compatible with any form library.
 *
 * ```tsx
 * <Field label="Email" error={form.errorFor('email')}>
 *   {({ id, describedBy, invalid }) => (
 *     <input id={id} aria-describedby={describedBy} aria-invalid={invalid} … />
 *   )}
 * </Field>
 * ```
 *
 * The Angular version exposed the id through a template variable (`#f` then
 * `f.controlId()`); a render function is the same hand-off with nothing to look up.
 */
export function Field({
  label,
  hint = '',
  error = '',
  required = false,
  className,
  children,
}: FieldProps) {
  const uid = `ui-field-${useId()}`;
  const controlId = `${uid}-control`;
  const errorId = `${uid}-error`;
  const hintId = `${uid}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-sm font-medium text-(--color-text)" htmlFor={controlId}>
        {label}
        {required ? (
          <>
            {' '}
            <span className="text-danger" aria-hidden="true">
              *
            </span>{' '}
            <span className="sr-only">(required)</span>
          </>
        ) : null}
      </label>

      {typeof children === 'function'
        ? children({ id: controlId, describedBy, invalid: Boolean(error) })
        : children}

      {error ? (
        <p className="text-sm text-danger" id={errorId}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-(--color-text-muted)" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
