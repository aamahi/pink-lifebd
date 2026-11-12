/**
 * Parse a wire-format numeric field into `number | null`, rejecting the empty
 * string and any non-finite result.
 *
 * The defect this closes is `Number('') === 0`. A field typed `number | string |
 * null` on the wire (the API sends a string for a decimal to avoid float
 * round-tripping, or omits the field entirely) reaches the client as `''` when a
 * form field was cleared or a query param was dropped. Routing that through the
 * built-in `Number()` coercion silently produces `0` -- a value the API never
 * stated -- and nothing throws, so the caller has no signal that the input was
 * absent rather than genuinely zero. Recorded as `admin#617` / `#609 P2-6`: a
 * cleared discount field rendered a confident `৳0.00` instead of the unavailable
 * dash, because `Number('')` fed straight into a formatter with no absence check
 * in between.
 *
 * This function is the one place that decision gets made, so every caller --
 * `formatBdtPrice` included -- inherits it instead of re-deriving it.
 */
export function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
