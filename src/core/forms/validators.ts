/**
 * Field validators for the small forms in this app (login, register, contact, checkout, profile,
 * addresses). Port of Angular's `Validators.*` plus `nameValidator` / `phoneValidator`.
 *
 * A validator takes the field's string value and returns an error MESSAGE, or `null` when it is
 * valid. Every validator except `required` treats an empty string as valid -- emptiness is
 * `required`'s job alone, so an optional field with a format rule only complains once it has text.
 * The messages are the ones the Angular `FormValidationService.errorFor` produced.
 */
export type Validator = (value: string) => string | null;

export const required: Validator = (value) =>
  value.trim() === '' ? 'This field is required.' : null;

/** Same loose shape Angular's `Validators.email` accepts. */
const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export const email: Validator = (value) =>
  value === '' || EMAIL_PATTERN.test(value) ? null : 'Enter a valid email address.';

export const minLength =
  (n: number): Validator =>
  (value) =>
    value === '' || value.length >= n ? null : `At least ${n} characters.`;

export const maxLength =
  (n: number): Validator =>
  (value) =>
    value.length <= n ? null : `At most ${n} characters.`;

const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s'-]*$/u;

export const name =
  (min = 2): Validator =>
  (raw) => {
    const value = raw.trim();
    if (value === '') return null;
    if (value.length < min) return `At least ${min} characters.`;
    if (!NAME_PATTERN.test(value)) return 'Use letters, spaces, hyphens or apostrophes only.';
    return null;
  };

const PHONE_PATTERN = /^01[3-9]\d{8}$/;

/** Bangladeshi mobile: 11 digits starting 013-019, with or without a +88 / 88 prefix. */
export const phone = (): Validator => (raw) => {
  const value = raw.trim();
  if (value === '') return null;
  const digits = value.replace(/[\s-]/g, '').replace(/^\+?88(?=01)/, '');
  return PHONE_PATTERN.test(digits) ? null : 'Enter an 11-digit mobile number, like 01712345678.';
};

/** First failing validator's message, or `null`. */
export function validateField(value: string, validators: readonly Validator[]): string | null {
  for (const validate of validators) {
    const message = validate(value);
    if (message !== null) return message;
  }
  return null;
}
