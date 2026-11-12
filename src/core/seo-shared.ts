import { environment } from '@/core/config/env';
import { SITE } from '@/core/config/site.config';

/**
 * The part of the SEO code that is safe on both sides of the server/client boundary: no hooks, no
 * DOM. `seo.ts` (server-safe, `pageMetadata`) and `use-seo.ts` (client, `useSeo`) both build on it.
 * Keeping it in its own file is what stops those two from importing each other.
 */
export interface PageSeo {
  readonly title: string;
  readonly description?: string;
  /** Route path, leading slash. Absolutized against `environment.siteUrl`. */
  readonly path?: string;
  /** Absolute or root-relative image URL for the Open Graph card. */
  readonly image?: string;
  readonly type?: 'website' | 'article' | 'product';
  /** Set on pages that must not be indexed (search results, previews, 404). */
  readonly noIndex?: boolean;
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = environment.siteUrl.replace(/\/+$/, '');
  return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export function fullTitle(seo: PageSeo): string {
  return seo.title ? `${seo.title} — ${SITE.name}` : SITE.name;
}
