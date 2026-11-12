import { formatBdtPrice } from '@/core/utils/format-bdt-price';
import { UNAVAILABLE } from '@/core/utils/money';

/**
 * Port of the Angular `bdtPrice` pipe: a taka-formatted amount, or the unavailable dash.
 *
 * `formatBdtPrice` is the pure formatter and returns `''` for an absent value; this is the DISPLAY
 * layer that maps `''` to `UNAVAILABLE` so an absent price still renders as a visible glyph.
 */
export function bdtPrice(value: number | string | null | undefined): string {
  const formatted = formatBdtPrice(value);
  return formatted === '' ? UNAVAILABLE : formatted;
}
