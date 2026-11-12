'use client';

import { Field } from '@/components/ui/field';
import { useForm } from '@/core/forms/use-form';
import {
  minLength,
  name as nameValidator,
  phone as phoneValidator,
  required,
} from '@/core/forms/validators';

/** The fields a failed submit can send focus to, in the order they appear on the page. */
export const REQUIRED_FIELDS = ['name', 'phone', 'address'] as const;

/**
 * The order form's values and rules: a name, a mobile number a courier can ring, an address of at
 * least a few characters, and an optional note. The same rules as the shop's own checkout.
 */
export function useCustomerForm() {
  return useForm(
    { name: '', phone: '', address: '', note: '' },
    {
      name: [required, nameValidator()],
      phone: [required, phoneValidator()],
      address: [required, minLength(5)],
    },
  );
}

export type CustomerForm = ReturnType<typeof useCustomerForm>;

/** 16px type, because iOS zooms the page into any smaller control on focus. */
const CONTROL =
  'w-full rounded-xl border border-(--color-rail-border) bg-white px-4 text-base text-(--color-rail-fg) outline-none transition-colors placeholder:text-(--color-rail-muted)/70 focus:border-(--color-rail-fg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) aria-[invalid=true]:border-danger';

/**
 * Name, mobile number and address (all required) and a note (optional), as the on-page order form.
 *
 * Each control has a `name` attribute: browsers autofill from it, and a failed submit finds the
 * first bad field by it and focuses it, so its message is where the customer is looking rather
 * than somewhere off screen. The placeholders are in Bangla, the language the ads are in.
 */
export function CustomerFields({ form }: { readonly form: CustomerForm }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Full name" required error={form.errorFor('name')}>
        {({ id, describedBy }) => (
          <input
            id={id}
            name="name"
            value={form.values.name}
            onChange={form.onChange('name')}
            onBlur={form.onBlur('name')}
            autoComplete="name"
            enterKeyHint="next"
            placeholder="আপনার নাম লিখুন"
            aria-invalid={form.isInvalid('name') ? 'true' : undefined}
            aria-describedby={describedBy}
            className={`${CONTROL} h-12`}
          />
        )}
      </Field>

      <Field label="Mobile number" required error={form.errorFor('phone')}>
        {({ id, describedBy }) => (
          <input
            id={id}
            name="phone"
            type="tel"
            inputMode="tel"
            value={form.values.phone}
            onChange={form.onChange('phone')}
            onBlur={form.onBlur('phone')}
            autoComplete="tel"
            enterKeyHint="next"
            placeholder="01XXXXXXXXX"
            aria-invalid={form.isInvalid('phone') ? 'true' : undefined}
            aria-describedby={describedBy}
            className={`${CONTROL} h-12`}
          />
        )}
      </Field>

      <Field
        label="Full address"
        hint="House, road, area and district."
        required
        error={form.errorFor('address')}
      >
        {({ id, describedBy }) => (
          <textarea
            id={id}
            name="address"
            value={form.values.address}
            onChange={form.onChange('address')}
            onBlur={form.onBlur('address')}
            rows={3}
            autoComplete="street-address"
            placeholder="আপনার ঠিকানা লিখুন"
            aria-invalid={form.isInvalid('address') ? 'true' : undefined}
            aria-describedby={describedBy}
            className={`${CONTROL} min-h-24 py-3`}
          />
        )}
      </Field>

      <Field label="Note (optional)">
        {({ id, describedBy }) => (
          <textarea
            id={id}
            name="note"
            value={form.values.note}
            onChange={form.onChange('note')}
            rows={2}
            placeholder="কিছু জানাতে চাইলে লিখুন"
            aria-describedby={describedBy}
            className={`${CONTROL} py-3`}
          />
        )}
      </Field>
    </div>
  );
}
