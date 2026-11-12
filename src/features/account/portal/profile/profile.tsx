'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useUnsavedChangesWarning } from '@/components/shared/navigation/use-unsaved-changes-warning';
import { useForm } from '@/core/forms/use-form';
import { email, name as nameValidator, required } from '@/core/forms/validators';

/**
 * Profile editor -- a static controlled form, the same shape as
 * the contact form: no fetch, so no loading/failed/empty branch
 * applies here (there is no request that can be pending or fail before the
 * form itself ever renders). What it demonstrates instead is the third
 * form archetype in this shard, sharing `useForm` and the `name` validator with
 * `checkout.tsx` and the contact form rather than re-typing either.
 *
 * Does not persist anywhere -- same honesty stance as `login.tsx`:
 * a demo template that silently "saved" a profile with nowhere to send it
 * would be a worse demo than a stub that says so.
 *
 * Warns on unsaved changes (navigation contract, ecom-fullstack#82/#83):
 * `useUnsavedChangesWarning(form.isDirty)` is both halves of what Angular split across
 * `pendingChangesGuard` (in-app navigation, only prompts when the form is actually dirty) and
 * `appWarnOnUnsavedChanges` (the tab-close/refresh case the router guard cannot cover).
 */
export function Profile() {
  const form = useForm(
    { name: 'Demo Customer', email: 'demo.customer@example.com' },
    {
      name: [required, nameValidator()],
      email: [required, email],
    },
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The timeout below fires after the render that scheduled it, so it reads the values through a ref
  // rather than the ones it closed over -- an edit made while "saving" must survive the save.
  const valuesRef = useRef(form.values);
  valuesRef.current = form.values;

  useUnsavedChangesWarning(form.isDirty);

  // A pending simulated save must not call into a page the visitor has already left.
  useEffect(() => () => clearTimeout(timer.current), []);

  const submit = form.handleSubmit(() => {
    setSaving(true);
    // Replace with a real PATCH/PUT. Kept as a success stub, unlike login's
    // failure stub, because saving your own already-loaded profile has no
    // missing backend to be honest ABOUT the same way authenticating does.
    timer.current = setTimeout(() => {
      setSaving(false);
      setSaved(true);
      // The form is no longer dirty relative to what was just "saved" --
      // otherwise `form.isDirty` would keep reporting unsaved changes
      // (and keep prompting on navigation) forever after a successful save.
      form.reset(valuesRef.current);
    }, 500);
  });

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-[--color-text]">Profile</h1>

      <Alert className="mt-4 block max-w-md" tone="info" title="This form is a demonstration">
        Nothing is saved. Wire <code className="font-mono">submit()</code> in{' '}
        <code className="font-mono">profile.tsx</code> to a real endpoint before using it.
      </Alert>

      {saved ? (
        <Alert className="mt-4 block max-w-md" tone="success" title="Profile updated">
          Your changes would normally be saved here.
        </Alert>
      ) : null}

      <form
        className="mt-6 flex max-w-md flex-col gap-5"
        onSubmit={(e: FormEvent) => void submit(e)}
        noValidate
      >
        <Field label="Full name" required error={form.errorFor('name')}>
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

        <Button type="submit" size="lg" loading={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </>
  );
}
