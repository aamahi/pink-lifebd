'use client';

import { useMemo } from 'react';
import { listProducts } from '@/core/data/catalog.api';
import type { Product } from '@/core/data/catalog.model';
import { useAsync } from '@/core/hooks/use-async';
import { LANDING_PAGES, type LandingSlug } from './landing.config';
import { sharedFaqs } from './shared-faqs';
import { Benefits } from './sections/benefits';
import { Faq } from './sections/faq';
import { HowToOrder } from './sections/how-to-order';
import { LandingBar, StickyOrderBar } from './sections/landing-bar';
import { LandingFooter } from './sections/landing-footer';
import { LandingHero } from './sections/landing-hero';
import { ProductSection, sellable } from './sections/product-section';
import { SizeGuide } from './sections/size-guide';

/** The lowest price among `products`; null when there are none to price. */
function cheapest(products: readonly Product[]): number | null {
  let lowest: number | null = null;
  for (const p of products) {
    if (p.price !== null && (lowest === null || p.price < lowest)) lowest = p.price;
  }
  return lowest;
}

export interface LandingPageProps {
  readonly slug: LandingSlug;
}

/**
 * An ad landing page: one template, three pages (`landing.config.ts`). The visitor arrives from an
 * ad wanting one thing, so the page is a straight line to the order: hero, reasons, the picker,
 * how ordering works, questions. It has its own slim bar and a phone order button in place of the
 * storefront's header, footer and tab bar (`layoutFlagsFor` in `main-layout.tsx`).
 *
 * It makes ONE catalogue request. The picker draws the four states from it and the hero's "From"
 * price and the size guide read the same answer, so a failed request is one retry button and never
 * a hero quoting a price the picker below it could not load.
 */
export function LandingPage({ slug }: LandingPageProps) {
  const config = LANDING_PAGES[slug];
  const catalogue = useAsync(() => listProducts(), []);

  const products = useMemo(
    () => (catalogue.status === 'ready' ? sellable(catalogue.data, config.select) : []),
    [catalogue, config.select],
  );
  const fromPrice = catalogue.status === 'loading' ? undefined : cheapest(products);
  const faqs = useMemo(() => [...sharedFaqs(), ...config.faqs], [config.faqs]);

  return (
    <div className="bg-(--color-hero-from)">
      <LandingBar />
      <LandingHero config={config} fromPrice={fromPrice} />
      <Benefits items={config.benefits} />
      <ProductSection config={config} catalogue={catalogue} />
      {config.showSizeGuide && <SizeGuide products={products} />}
      <HowToOrder />
      <Faq items={faqs} />
      <LandingFooter />
      <StickyOrderBar label={config.cta} />
    </div>
  );
}
