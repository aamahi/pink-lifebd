import { SITE } from '@/core/config/site.config';

/**
 * Money formatting, with ABSENT and ZERO kept apart.
 *
 * The trap this exists to close, measured on the house storefront: a client shipped
 * ahead of its API does not error. The request returns 200, the server drops the
 * parameter it does not know, the response omits the field, and a `?? 0` in the
 * template renders a confident `BDT 0.00`. Nothing failed, so no error path runs and
 * no "unavailable" state is ever reached -- the page states a price that is wrong in
 * the one direction a customer acts on.
 *
 * So `formatMoney` takes `number | null | undefined` and returns `UNAVAILABLE` for
 * the absent cases. Callers cannot coalesce their way past it, because there is no
 * numeric default to coalesce TO. A component that wants to hide a missing price
 * must check for absence explicitly, which is the point.
 *
 * NaN and Infinity are absent too. They come from arithmetic on a field that was
 * already missing (`undefined * 2`), so treating them as a number would re-open the
 * hole one layer up.
 */
export const UNAVAILABLE = '—'; // em dash

/** Minor-unit fraction digits by ISO 4217 code, for codes where it is not 2. */
const ZERO_DECIMAL = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

function fractionDigits(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

export interface MoneyOptions {
  readonly currency?: string;
  readonly locale?: string;
  /** Drop the fraction digits on whole amounts. For dense list views. */
  readonly compact?: boolean;
}

export function formatMoney(amount: number | null | undefined, options: MoneyOptions = {}): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return UNAVAILABLE;
  }
  const currency = options.currency ?? SITE.currency;
  const locale = options.locale ?? SITE.locale;
  const digits = options.compact && Number.isInteger(amount) ? 0 : fractionDigits(currency);

  // Intl throws RangeError on an unknown currency or a malformed locale. A demo
  // that white-screens because someone typo'd a config value is worse than one that
  // shows the raw number, so fall back rather than propagate.
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(digits)}`;
  }
}

/**
 * True when a price should render as unavailable rather than as a number.
 *
 * Exported so a template can branch on absence WITHOUT re-implementing the test --
 * `price == null` misses NaN, and `!price` also swallows a genuine free item at 0.
 */
export function isMoneyAbsent(amount: number | null | undefined): boolean {
  return amount === null || amount === undefined || !Number.isFinite(amount);
}
