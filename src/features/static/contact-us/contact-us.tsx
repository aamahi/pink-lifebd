'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { SITE } from '@/core/config/site.config';
import { useForm } from '@/core/forms/use-form';
import { email, minLength, name as nameValidator, required } from '@/core/forms/validators';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';

const CONTROL_SINGLE =
  'h-10 rounded-md border border-[--color-border] bg-[--color-surface] px-3 text-sm focus:outline focus:outline-2 focus:outline-primary';

/**
 * Static/CMS archetype, contact variant, at `/contact-us`.
 *
 * `useForm` (`core/forms/use-form.ts`) is the React counterpart of the typed reactive `FormGroup` the
 * Angular version used: every field is a string, so `form.values` is
 * `{ name: string; email: string; message: string }` with nothing to narrow.
 *
 * `form.errorFor` / `form.markAllTouched` replace the Angular `FormValidationService` -- one mapping
 * from a validator to a sentence, shared with every other form in the app, rather than re-typed per
 * form.
 *
 * Still does NOT post anywhere, for the same reason the old version did not: a
 * demo template that ships a working contact endpoint ships a spam relay. The
 * simulated submit is visible on screen and `submit()` carries the one comment
 * saying where a real POST goes.
 */
export function ContactUs() {
  const form = useForm(
    { name: '', email: '', message: '' },
    {
      name: [required, nameValidator()],
      email: [required, email],
      message: [required, minLength(10)],
    },
  );

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFailure(null);
    if (!form.markAllTouched()) return;

    setSending(true);
    // Replace this timeout with the real POST. Keep the three-state shape --
    // sending / sent / failure -- because a form that cannot express failure will
    // eventually swallow one.
    timer.current = setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 600);
  }

  return (
    <section className="page-shell max-w-2xl py-10">
      <h1 className="text-2xl font-bold tracking-tight text-[--color-text]">Contact</h1>
      <p className="mt-2 text-[--color-text-muted]">
        Reach us at{' '}
        <a className="text-primary hover:underline" href={'mailto:' + SITE.contact.email}>
          {SITE.contact.email}
        </a>
        , or use the form.
      </p>

      <Alert className="mt-6 block" tone="info" title="This form is a demonstration">
        Nothing is sent. Wire the submit handler in{' '}
        <code className="font-mono">contact-us.tsx</code> to a real endpoint before using it.
      </Alert>

      {sent ? (
        <Alert className="mt-6 block" tone="success" title="Message received">
          Thanks — we would normally reply to {form.values.email} within a working day.
        </Alert>
      ) : (
        <>
          {failure ? (
            <Alert className="mt-6 block" tone="danger" title="Could not send">
              {failure}
            </Alert>
          ) : null}

          <form className="mt-6 flex flex-col gap-5" onSubmit={submit} noValidate>
            <Field label="Your name" required error={form.errorFor('name')}>
              {({ id, describedBy }) => (
                <input
                  id={id}
                  value={form.values.name}
                  onChange={form.onChange('name')}
                  onBlur={form.onBlur('name')}
                  aria-invalid={form.isInvalid('name') ? 'true' : undefined}
                  aria-describedby={describedBy || undefined}
                  className={CONTROL_SINGLE}
                />
              )}
            </Field>

            <Field label="Email" required hint="We reply here." error={form.errorFor('email')}>
              {({ id, describedBy }) => (
                <input
                  id={id}
                  type="email"
                  value={form.values.email}
                  onChange={form.onChange('email')}
                  onBlur={form.onBlur('email')}
                  aria-invalid={form.isInvalid('email') ? 'true' : undefined}
                  aria-describedby={describedBy || undefined}
                  className={CONTROL_SINGLE}
                />
              )}
            </Field>

            <Field label="Message" required error={form.errorFor('message')}>
              {({ id, describedBy }) => (
                <textarea
                  id={id}
                  value={form.values.message}
                  onChange={form.onChange('message')}
                  onBlur={form.onBlur('message')}
                  rows={5}
                  aria-invalid={form.isInvalid('message') ? 'true' : undefined}
                  aria-describedby={describedBy || undefined}
                  className="rounded-md border border-[--color-border] bg-[--color-surface] p-3 text-sm focus:outline focus:outline-2 focus:outline-primary"
                />
              )}
            </Field>

            <div>
              {/*
                Not disabled while invalid. A disabled submit gives no feedback about
                WHY it is disabled and is unreachable by keyboard, so the errors are
                shown on submit instead. Disabled while SENDING is a different thing and
                is correct -- it stops a double post.
              */}
              <Button type="submit" size="lg" loading={sending}>
                {sending ? 'Sending…' : 'Send message'}
              </Button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
