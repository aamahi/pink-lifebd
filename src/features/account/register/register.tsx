'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useForm } from '@/core/forms/use-form';
import { email, minLength, name as nameValidator, required } from '@/core/forms/validators';
import { BrandLogo } from '@/components/shared/brand-logo';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';

/**
 * Auth archetype, register variant, at `/account/register`.
 *
 * Bare chrome, same as `login.tsx` and for the same reason -- the two are the pair `MainLayout`
 * renders without header and footer (it reads `usePathname()`; the Angular `data: { layout: {
 * hideHeader: true, hideFooter: true } }` flags are gone), and toggling between them is the second
 * half of AC1's own worked example.
 *
 * The confirm-password check lives OUTSIDE the per-field validators -- a `Validator` sees one
 * field's own value, never a sibling's, so a cross-field rule has nowhere to attach inside
 * `useForm`'s schema. It is re-evaluated on every render from the current values, which is what lets
 * the error clear the instant the two fields agree rather than staying stuck until the next submit.
 */
export function Register() {
  const form = useForm(
    { name: '', email: '', password: '', confirmPassword: '' },
    {
      name: [required, nameValidator()],
      email: [required, email],
      password: [required, minLength(8)],
      confirmPassword: [required],
    },
  );

  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [confirmDirty, setConfirmDirty] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // A pending simulated request must not call into a page the visitor has already left.
  useEffect(() => () => clearTimeout(timer.current), []);

  const mismatch = passwordsMismatch(form.values.password, form.values.confirmPassword);

  /**
   * The group-level `passwordsMismatch` error is surfaced through the confirm
   * field specifically -- a person reads "the passwords don't match" next to the
   * SECOND password box, not floating above the submit button.
   */
  const confirmError = (): string => {
    if (!confirmTouched && !confirmDirty && !form.submitted) return '';
    return mismatch ? "Passwords don't match." : '';
  };

  const submit = form.handleSubmit((values) => {
    if (passwordsMismatch(values.password, values.confirmPassword)) return;

    setSubmitting(true);
    // Replace this timeout with a real registration POST. Kept as a failure
    // stub, not a fake success, for the reason stated on Login.
    timer.current = setTimeout(() => {
      setSubmitting(false);
      setFailure('This is a demo template -- no registration backend is configured yet.');
    }, 600);
  });

  const onSubmit = (e: FormEvent) => {
    setFailure(null);
    void submit(e);
  };

  const onConfirmChange = (e: ChangeEvent<HTMLInputElement>) => {
    setConfirmDirty(true);
    form.onChange('confirmPassword')(e);
  };

  const onConfirmBlur = () => {
    setConfirmTouched(true);
    form.onBlur('confirmPassword')();
  };

  return (
    <section className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="block h-[51px] w-[144px] outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <BrandLogo className="h-full w-full object-contain object-left" />
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[--color-text]">
          Create an account
        </h1>

        <Alert className="mt-4 block" tone="info" title="This form is a demonstration">
          No account is created. Wire <code className="font-mono">submit()</code> in{' '}
          <code className="font-mono">register.tsx</code> to a real endpoint before using it.
        </Alert>

        {failure ? (
          <Alert className="mt-4 block" tone="danger" title="Could not create the account">
            {failure}
          </Alert>
        ) : null}

        <form className="mt-6 flex flex-col gap-5" onSubmit={onSubmit} noValidate>
          <Field label="Your name" required error={form.errorFor('name')}>
            {({ id, describedBy }) => (
              <input
                id={id}
                value={form.values.name}
                onChange={form.onChange('name')}
                onBlur={form.onBlur('name')}
                autoComplete="name"
                aria-invalid={form.isInvalid('name') ? 'true' : undefined}
                aria-describedby={describedBy}
                className="h-10 rounded-md border border-[--color-border] bg-[--color-surface] px-3 text-sm focus:outline focus:outline-2 focus:outline-primary"
              />
            )}
          </Field>

          <Field label="Email" required error={form.errorFor('email')}>
            {({ id, describedBy }) => (
              <input
                id={id}
                type="email"
                value={form.values.email}
                onChange={form.onChange('email')}
                onBlur={form.onBlur('email')}
                autoComplete="email"
                aria-invalid={form.isInvalid('email') ? 'true' : undefined}
                aria-describedby={describedBy}
                className="h-10 rounded-md border border-[--color-border] bg-[--color-surface] px-3 text-sm focus:outline focus:outline-2 focus:outline-primary"
              />
            )}
          </Field>

          <Field
            label="Password"
            required
            hint="At least 8 characters."
            error={form.errorFor('password')}
          >
            {({ id, describedBy }) => (
              <input
                id={id}
                type="password"
                value={form.values.password}
                onChange={form.onChange('password')}
                onBlur={form.onBlur('password')}
                autoComplete="new-password"
                aria-invalid={form.isInvalid('password') ? 'true' : undefined}
                aria-describedby={describedBy}
                className="h-10 rounded-md border border-[--color-border] bg-[--color-surface] px-3 text-sm focus:outline focus:outline-2 focus:outline-primary"
              />
            )}
          </Field>

          <Field label="Confirm password" required error={confirmError()}>
            {({ id, describedBy }) => (
              <input
                id={id}
                type="password"
                value={form.values.confirmPassword}
                onChange={onConfirmChange}
                onBlur={onConfirmBlur}
                autoComplete="new-password"
                aria-invalid={confirmError() ? 'true' : undefined}
                aria-describedby={describedBy}
                className="h-10 rounded-md border border-[--color-border] bg-[--color-surface] px-3 text-sm focus:outline focus:outline-2 focus:outline-primary"
              />
            )}
          </Field>

          <Button type="submit" size="lg" block loading={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-sm text-[--color-text-muted]">
          Already have an account?{' '}
          <Link href="/account/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </section>
  );
}

/**
 * Cross-field check: the two password fields must hold equal values. Kept as a function of both
 * values rather than a `Validator` -- a `Validator` receives one field's own value, never a sibling's,
 * and cross-field checks have no other attachment point in `useForm`'s schema.
 */
function passwordsMismatch(password: string, confirmPassword: string): boolean {
  return password !== confirmPassword;
}
