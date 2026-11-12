import { toNullableNumber } from '@/core/utils/to-nullable-number';

/**
 * BDT-specific price formatter required by issue #938, and its stated division of
 * labour with `money.ts`.
 *
 * `money.ts` already owns general-purpose formatting: `formatMoney` accepts any
 * ISO 4217 currency and renders an absent amount as `UNAVAILABLE` (the em dash),
 * because a demo page needs a visible glyph, not a blank cell. `formatBdtPrice`
 * is a second, narrower formatter with a different contract that the ticket
 * states explicitly: it returns the EMPTY STRING for `null`, `undefined` and
 * `''`, never the em dash and never a formatted zero.
 *
 * The two are not redundant and neither should be deleted in favour of the
 * other. `formatBdtPrice` is the PURE formatter -- a function of its input alone,
 * with no display opinion -- which is what makes it composable into contexts
 * that are not "render a price on screen": a CSV export, a `title` attribute, an
 * aria-label built by string concatenation, anywhere an em dash would be the
 * wrong character. `BdtPricePipe` (`../pipes/bdt-price.pipe.ts`) is the DISPLAY
 * layer: it calls `formatBdtPrice` and maps `''` to `UNAVAILABLE` before the
 * result reaches a template, so an absent price still renders as a visible dash
 * on screen. Collapsing either direction reintroduces a bug: inlining the
 * `UNAVAILABLE` mapping into this function breaks every non-display caller, and
 * deleting this function in favour of `formatMoney` loses the empty-string
 * contract the ticket's unit tests assert against.
 *
 * `\u2060` after the currency sign is the WORD JOINER (U+2060), written as the
 * escape sequence rather than pasted as a raw invisible character -- an editor
 * that cannot see a character cannot know not to delete it while retyping the
 * string. It stops a browser line-breaking between the taka sign and the digits
 * (AC 2); the unit test asserts it sits at index 1 of the returned string.
 *
 * `toNullableNumber` (not `Number()`) is why an empty string returns `''`
 * instead of a confident `৳0.00` -- see its header comment for the recorded
 * defect this guards against.
 */
export function formatBdtPrice(value: number | string | null | undefined): string {
  const n = toNullableNumber(value);
  if (n === null) return '';
  // The literal '৳' is this file's brand seam, exempted by name in
  // scripts/check-conventions.js's BRAND_EXEMPT list -- see the comment there for
  // why a hand-typed currency sign is banned everywhere else in src/app/.
  return (
    '৳\u2060' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  );
}
