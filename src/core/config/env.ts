/**
 * Deployment facts, read from `NEXT_PUBLIC_*` variables (see `.env.example`).
 *
 * Replaces the Angular `src/environments/` pair. Same seam, same defaults:
 *
 *   - `apiBaseUrl` empty (the default) = FIXTURE MODE. The catalogue, cart and orders are served
 *     from in-memory fixtures behind 350 ms of artificial latency, so loading states render.
 *   - `apiBaseUrl` set = API mode. A failed request surfaces as an error; there is NO silent
 *     fallback to fixtures (a fallback turns a broken integration into a page that looks perfect).
 */
export interface Environment {
  readonly production: boolean;
  readonly apiBaseUrl: string;
  readonly tenantId: string;
  readonly siteUrl: string;
  /** Shows the "Fixture data -- no API configured" badge. */
  readonly debug: boolean;
  readonly reportingTimeZone: {
    readonly label: string;
    readonly utcOffset: string;
    readonly offsetMinutes: number;
  };
}

const isProduction = process.env.NODE_ENV === 'production';

export const environment: Environment = {
  production: isProduction,
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
  tenantId: process.env.NEXT_PUBLIC_TENANT_ID ?? '',
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (isProduction ? 'https://clothing.tenels.com' : 'http://localhost:3000'),
  debug: !isProduction,
  reportingTimeZone: { label: 'Asia/Dhaka', utcOffset: '+06:00', offsetMinutes: 360 },
};
