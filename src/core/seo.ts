import type { Metadata } from 'next';
import { SITE } from '@/core/config/site.config';
import { absoluteUrl, fullTitle, type PageSeo } from '@/core/seo-shared';

/**
 * SEO entry point. Deliberately NOT a `'use client'` module: server `page.tsx` files call
 * `pageMetadata()` at module level, and Next refuses to call a function exported from a client
 * module on the server.
 *
 * `useSeo` / `applySeo` live in `use-seo.ts` (a client module) and are re-exported here so every view
 * can keep a single import path, `@/core/seo`. A server module may re-export a client reference; it is
 * simply never called on the server.
 */
export type { PageSeo } from '@/core/seo-shared';
export { applySeo, useSeo } from '@/core/use-seo';

/**
 * Static SEO: `export const metadata = pageMetadata({ title: 'Contact', path: '/contact-us' })` in a
 * server `page.tsx`. Prefer this wherever the title does not depend on loaded data -- it is in the
 * HTML a link-preview crawler reads, which the Angular build (client-rendered) could not offer.
 *
 * The title is rendered whole (`Contact — Pink Life`) rather than through a root title template, so
 * the string a page sets is the string the tab shows, the same as the Angular SeoService.
 */
export function pageMetadata(seo: PageSeo): Metadata {
  const title = fullTitle(seo);
  const description = seo.description ?? SITE.description;
  const url = absoluteUrl(seo.path ?? '/');
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: seo.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      siteName: SITE.name,
      images: seo.image ? [absoluteUrl(seo.image)] : undefined,
    },
    twitter: { card: seo.image ? 'summary_large_image' : 'summary' },
  };
}
