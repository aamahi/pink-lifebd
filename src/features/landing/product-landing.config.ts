/**
 * Plain data for the single-product ad page (`/lp/[slug]`); no `'use client'`, so the server
 * `page.tsx` can read it for the link-preview image.
 *
 * `AD_PHOTOS` is the photographs a product's ad page may show besides its cut-out, and it is an
 * allow-list on purpose, not "the product's whole gallery". Much of the catalogue's gallery is a
 * supplier's own marketing pictures with another seller's branding on them. For
 * `lace-bra-and-brief-set-rose`, photos 2 to 7 carry a magenta strip reading "SHAJGOJ: purchase
 * from Shajgoj app & get extra discount", a Valene logo and an "It's you, but new" badge (checked
 * by looking at the files). The shop's own product page can live with that; an ad page is the one
 * place that must not tell a customer to buy somewhere else. Photo 1, the flat-lay on light blue,
 * has none of it.
 *
 * A product with no entry shows its cut-out only. Add a photo here after looking at it.
 */
export const AD_PHOTOS: Readonly<Record<string, readonly string[]>> = {
  'lace-bra-and-brief-set-rose': ['images/products/lace-bra-and-brief-set-rose-1.webp'],
};

/** The photographs `slug`'s ad page may show; empty when none have been cleared. */
export function adPhotosFor(slug: string): readonly string[] {
  return Object.hasOwn(AD_PHOTOS, slug) ? (AD_PHOTOS[slug] ?? []) : [];
}
