import { SITE } from '@/core/config/site.config';

/**
 * `formatSiteDate(order.placedAt, 'datetime')` -> a date rendered in the SITE's zone.
 *
 * (Port of the Angular `siteDate` pipe.) The viewer's zone is the wrong default for a fact that
 * belongs to the business -- an order's placed-at -- and the failure is silent: a plausible
 * timestamp shifted by hours, or a date a day off.
 *
 *   - A bare `YYYY-MM-DD` string is parsed by `new Date()` as UTC MIDNIGHT, so in a zone behind UTC
 *     it renders as the previous day. Date-only inputs are formatted from their literal parts.
 *   - An unparseable or absent value returns a visible dash, never "Invalid Date" or an empty cell.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export type SiteDateFormat = 'date' | 'datetime' | 'time' | 'long';

const FORMATS: Record<SiteDateFormat, Intl.DateTimeFormatOptions> = {
  date: { year: 'numeric', month: 'short', day: 'numeric' },
  datetime: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  },
  time: { hour: 'numeric', minute: '2-digit' },
  long: { dateStyle: 'full' },
};

export function formatSiteDate(
  value: Date | string | number | null | undefined,
  format: SiteDateFormat = 'date',
): string {
  if (value === null || value === undefined || value === '') return '—';

  if (typeof value === 'string' && DATE_ONLY.test(value)) {
    const [y, m, d] = value.split('-').map(Number) as [number, number, number];
    return new Intl.DateTimeFormat(SITE.locale, {
      ...FORMATS[format === 'time' ? 'date' : format],
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(y, m - 1, d)));
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  try {
    return new Intl.DateTimeFormat(SITE.locale, {
      ...FORMATS[format],
      timeZone: SITE.timeZone,
    }).format(parsed);
  } catch {
    // An unknown IANA zone in site.config.ts throws RangeError. Fall back to the host zone.
    return new Intl.DateTimeFormat(SITE.locale, FORMATS[format]).format(parsed);
  }
}
