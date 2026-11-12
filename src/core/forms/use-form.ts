'use client';

import { useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { validateField, type Validator } from '@/core/forms/validators';

export type FormSchema<T extends Record<string, string>> = {
  readonly [K in keyof T]?: readonly Validator[];
};

/**
 * A small controlled-form hook: the React counterpart of Angular's typed reactive `FormGroup` plus
 * `FormValidationService`. All values are strings (checkbox/radio fields store their value string).
 *
 *   const form = useForm({ name: '', email: '' }, { name: [required, name()], email: [required, email] });
 *   <input value={form.values.name} onChange={form.onChange('name')} onBlur={form.onBlur('name')}
 *          aria-invalid={form.isInvalid('name') || undefined} />
 *   <Field error={form.errorFor('name')}> ... </Field>
 *   <form onSubmit={form.handleSubmit((values) => send(values))} noValidate>
 *
 * `errorFor(field)` returns '' until the field is touched (blurred), dirty, or a submit was attempted
 * -- the same gate `FormValidationService.errorFor` applied -- so an untouched form is not a wall of
 * red. A failed submit marks every field touched at once (`markAllAsTouched`) and does NOT call the
 * handler; the submit button is never disabled-while-invalid (it would give no feedback about why).
 */
export function useForm<T extends Record<string, string>>(initial: T, schema: FormSchema<T> = {}) {
  const [values, setValues] = useState<T>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [dirty, setDirty] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const schemaRef = useRef(schema);
  schemaRef.current = schema;
  const initialRef = useRef(initial);

  const validate = useCallback(
    (field: keyof T, value: string): string => {
      const validators = schemaRef.current[field];
      return validators ? (validateField(value, validators) ?? '') : '';
    },
    [],
  );

  const errors = useMemo(() => {
    const out = {} as Record<keyof T, string>;
    for (const key of Object.keys(values) as (keyof T)[]) out[key] = validate(key, values[key] as string);
    return out;
  }, [values, validate]);

  const isValid = useMemo(() => Object.values(errors).every((e) => e === ''), [errors]);

  const errorFor = useCallback(
    (field: keyof T, force = false): string => {
      const shown = force || submitted || touched[field] || dirty[field];
      return shown ? errors[field] : '';
    },
    [errors, submitted, touched, dirty],
  );

  const isInvalid = useCallback((field: keyof T, force = false) => errorFor(field, force) !== '', [errorFor]);

  const setValue = useCallback((field: keyof T, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setDirty((d) => ({ ...d, [field]: true }));
  }, []);

  const onChange = useCallback(
    (field: keyof T) =>
      (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setValue(field, e.target.value),
    [setValue],
  );

  const onBlur = useCallback(
    (field: keyof T) => () => setTouched((t) => ({ ...t, [field]: true })),
    [],
  );

  /** Marks every field touched so each error shows, and reports whether the form was valid at all. */
  const markAllTouched = useCallback((): boolean => {
    setSubmitted(true);
    return Object.values(errors).every((e) => e === '');
  }, [errors]);

  const handleSubmit = useCallback(
    (onValid: (values: T) => void | Promise<void>) => (e?: { preventDefault: () => void }) => {
      e?.preventDefault();
      if (!markAllTouched()) return;
      return onValid(values);
    },
    [markAllTouched, values],
  );

  const reset = useCallback((next?: T) => {
    setValues(next ?? initialRef.current);
    if (next) initialRef.current = next;
    setTouched({});
    setDirty({});
    setSubmitted(false);
  }, []);

  /** True once any field has been edited since the last `reset` -- drives the unsaved-changes warning. */
  const isDirty = Object.keys(dirty).length > 0;

  return {
    values,
    errors,
    isValid,
    isDirty,
    submitted,
    setValue,
    setValues,
    onChange,
    onBlur,
    errorFor,
    isInvalid,
    markAllTouched,
    handleSubmit,
    reset,
  };
}
