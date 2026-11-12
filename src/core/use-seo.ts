'use client';

import { useEffect } from 'react';
import { SITE } from '@/core/config/site.config';
import { absoluteUrl, fullTitle, type PageSeo } from '@/core/seo-shared';

function setMeta(attr: 'name' | 'property', key: string, content: string | null): void {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (content === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Applies SEO tags in the browser. Port of the Angular `SeoService.apply`; use it from a client view
 * whose title depends on data that loads after mount (a product name). Static pages use
 * `pageMetadata` (`seo.ts`) instead.
 *
 * Tags are UPDATED in place, never appended (`updateTag` semantics): an append would leave two
 * descriptions in the head after navigating between two pages that both set one, and a crawler reads
 * whichever it reaches first -- the stale one. `robots` is REMOVED rather than set to "index,follow"
 * on indexable pages, so a stale noindex cannot survive navigating off a private page.
 */
export function applySeo(seo: PageSeo): void {
  const title = fullTitle(seo);
  const description = seo.description ?? SITE.description;
  const url = absoluteUrl(seo.path ?? '/');

  document.title = title;
  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:type', seo.type ?? 'website');
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:site_name', SITE.name);
  setMeta('name', 'twitter:card', seo.image ? 'summary_large_image' : 'summary');
  setMeta('property', 'og:image', seo.image ? absoluteUrl(seo.image) : null);
  setMeta('name', 'robots', seo.noIndex ? 'noindex,nofollow' : null);

  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

/** `useSeo({ title: product.name, path: ... })`; pass `null` while the data is still loading. */
export function useSeo(seo: PageSeo | null): void {
  const { title, description, path, image, type, noIndex } = seo ?? {};
  const active = seo !== null;
  useEffect(() => {
    if (!active) return;
    applySeo({ title: title ?? '', description, path, image, type, noIndex });
  }, [active, title, description, path, image, type, noIndex]);
}
