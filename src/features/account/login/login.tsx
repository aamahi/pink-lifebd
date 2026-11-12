'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useForm } from '@/core/forms/use-form';
import { email, minLength, required } from '@/core/forms/validators';
import { BrandLogo } from '@/components/shared/brand-logo';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';

/**
 * Auth archetype, login variant, at `/account/login`.
 *
 * `MainLayout` hides the header and footer for this path (it reads `usePathname()`; the Angular
 * route's `data: { layout: { hideHeader: true, hideFooter: true } }` flags are gone) -- one of the
 * two routes in the whole tree that renders bare. The bare chrome is a deliberate choice for an
 * auth screen, not an accident of this shard: a login form is not a place a demo author wants the
 * header's search box or the footer's social links competing for attention.
 *
 * A controlled form on `useForm`, for the same reason as the contact form (issue #938's AC).
 * Shares the validators with that form rather than re-typing an `errorFor` method.
 *
 * Does not authenticate anyone. `submit()` simulates a request and shows a
 * failure alert -- there is no `AccountService` in this shard, and a fake
 * "success" that leads nowhere would be a worse demo than an honest stub. The
 * account portal shard 3B ships is what a real "signed in" state has to land on.
 */
export function Login() {
  const form = useForm(
    { email: '', password: '' },
    {
      email: [required, email],
      password: [required, minLength(8)],
    },
  );

  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // A pending simulated request must not call into a page the visitor has already left.
  useEffect(() => () => clearTimeout(timer.current), []);

  const submit = form.handleSubmit(() => {
    setSubmitting(true);
    // Replace this timeout with a real auth POST. The failure branch is kept
    // reachable on purpose -- see the component comment on why this stub reports
    // failure rather than a fake success with nowhere to send anyone.
    timer.current = setTimeout(() => {
      setSubmitting(false);
      setFailure('This is a demo template -- no authentication backend is configured yet.');
    }, 600);
  });

  const onSubmit = (e: FormEvent) => {
    setFailure(null);
    void submit(e);
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
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[--color-text]">Log in</h1>

        <Alert className="mt-4 block" tone="info" title="This form is a demonstration">
          No account is created or checked. Wire <code className="font-mono">submit()</code> in{' '}
          <code className="font-mono">login.tsx</code> to a real auth endpoint before using it.
        </Alert>

        {failure ? (
          <Alert className="mt-4 block" tone="danger" title="Could not log in">
            {failure}
          </Alert>
        ) : null}

        <form className="mt-6 flex flex-col gap-5" onSubmit={onSubmit} noValidate>
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

          <Field label="Password" required error={form.errorFor('password')}>
            {({ id, describedBy }) => (
              <input
                id={id}
                type="password"
                value={form.values.password}
                onChange={form.onChange('password')}
                onBlur={form.onBlur('password')}
                autoComplete="current-password"
                aria-invalid={form.isInvalid('password') ? 'true' : undefined}
                aria-describedby={describedBy}
                className="h-10 rounded-md border border-[--color-border] bg-[--color-surface] px-3 text-sm focus:outline focus:outline-2 focus:outline-primary"
              />
            )}
          </Field>

          <Button type="submit" size="lg" block loading={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>

        <p className="mt-6 text-sm text-[--color-text-muted]">
          Don&apos;t have an account?{' '}
          <Link href="/account/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </div>
    </section>
  );
}
