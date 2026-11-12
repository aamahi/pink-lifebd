import type { Product } from '@/core/data/catalog.model';

/**
 * The three ad landing pages (`/lp/bra`, `/lp/panty-combo`, `/lp/nightwear`): one template
 * (`landing-page.tsx`), three sets of copy and a rule for which catalogue rows each one sells.
 *
 * This file is plain data with no `'use client'`, so a server `page.tsx` can read `seo` from it for
 * `generateMetadata`. The route passes only the `slug` down to the client template, which looks the
 * config up here: `select` is a function, and a function cannot cross the server/client boundary
 * as a prop.
 *
 * Nothing here states a discount, a review, a rating or a return policy. The catalogue has no
 * combo price, and its ratings are placeholders; a landing page is the one place a made-up number
 * reads as a promise to a stranger from an ad.
 */
export type LandingSlug = 'bra' | 'panty-combo' | 'nightwear';

export interface LandingBenefit {
  /** A Material Symbols ligature (`components/shared/icons/icon.tsx` falls back to the font). */
  readonly icon: string;
  readonly title: string;
  readonly text: string;
}

export interface LandingFaq {
  readonly q: string;
  readonly a: string;
}

export interface LandingConfig {
  readonly slug: LandingSlug;
  readonly path: string;
  /**
   * 'pick': each product is a tile with its own Add to cart / Order now.
   * 'combo': tiles add to a tray of `comboSize` pieces, which goes to the cart together.
   */
  readonly mode: 'pick' | 'combo';
  /** Pieces in one combo; null for a page that sells single pieces. */
  readonly comboSize: number | null;
  /** The catalogue rows this page sells. */
  readonly select: (p: Product) => boolean;
  readonly seo: { readonly title: string; readonly description: string };

  readonly eyebrow: string;
  readonly headline: string;
  /** The hero's second line, set in the brand pink. */
  readonly headlineAccent: string;
  /** Bangla line under the headline; the ads are in Bangla, so the page they land on is too. */
  readonly bangla: string;
  readonly lede: string;
  /** Primary button label, and where in the page it goes. */
  readonly cta: string;
  /**
   * Hero cut-outs, middle one first. Static `public/` paths rather than catalogue lookups: the hero
   * paints before the catalogue answers, and a hero that waited on `listProducts()` would be an
   * empty box for the first 350 ms of every ad click.
   */
  readonly heroImages: readonly [string, string, string];

  readonly pickerTitle: string;
  readonly pickerHint: string;
  readonly benefits: readonly LandingBenefit[];
  /** Whether to show the size charts of the products that have one. */
  readonly showSizeGuide: boolean;
  readonly faqs: readonly LandingFaq[];
}

/** A hero cut-out: the catalogue photo of that piece, cropped tight (`public/images/landing/`). */
const image = (name: string) => `images/landing/${name}.webp`;

export const LANDING_PAGES: Readonly<Record<LandingSlug, LandingConfig>> = {
  bra: {
    slug: 'bra',
    path: '/lp/bra',
    mode: 'pick',
    comboSize: null,
    // The "Lace Bra & Brief Set" is in the bras category, so it is here too.
    select: (p) => p.category === 'bras',
    seo: {
      title: 'Bras',
      description:
        'Wired, wireless, seamless and chikan cotton bras. Choose your colour and size, and pay ' +
        'cash on delivery anywhere in Bangladesh.',
    },
    eyebrow: 'Bras',
    headline: 'The bra that fits',
    headlineAccent: 'the way you like',
    bangla: 'পছন্দের রঙ আর সাইজ বেছে নিন, ঘরে বসেই।',
    lede: 'Underwired lift, wireless comfort, seamless under a tee, soft chikan cotton for every day. Pick your colour and size, and pay when it reaches you.',
    cta: 'Choose your bra',
    heroImages: [image('chikan-bra-pink'), image('comfy-bra-wine'), image('candy-bra-babypink')],
    pickerTitle: 'Pick your bra',
    pickerHint: 'Choose a colour and size, then order. You can add more than one.',
    benefits: [
      {
        icon: 'checkroom',
        title: 'Every kind of support',
        text: 'Underwired lift, wireless comfort, seamless styles and chikan cotton, in one place.',
      },
      {
        icon: 'favorite',
        title: 'Soft where it touches',
        text: 'Lined cups, adjustable straps and soft lace trim, so it sits comfortably.',
      },
      {
        icon: 'straighten',
        title: 'Colour and size, your way',
        text: 'Most styles come in three colours. Size charts sit under the photos where we have one.',
      },
      {
        icon: 'payments',
        title: 'Cash on Delivery',
        text: 'Order from home and pay when it reaches you, anywhere in Bangladesh.',
      },
    ],
    showSizeGuide: true,
    faqs: [
      {
        q: 'How do I choose my size?',
        a: 'Every style lists the sizes it comes in. Where we have a size chart it is shown in the size guide on this page and on the product page. Pick your usual size from the chart.',
      },
      {
        q: 'Can I order more than one bra?',
        a: 'Yes. Add as many as you like to the cart and place one order. Each colour and size is its own line in the cart.',
      },
    ],
  },

  'panty-combo': {
    slug: 'panty-combo',
    path: '/lp/panty-combo',
    mode: 'combo',
    comboSize: 3,
    select: (p) => p.category === 'panties',
    seo: {
      title: 'Panty Combo',
      description:
        'Build your own panty combo: pick any three styles in lace, seamless or cotton, each in ' +
        'your colour and size. Cash on delivery anywhere in Bangladesh.',
    },
    eyebrow: 'Panty combo',
    headline: 'Build your own',
    headlineAccent: 'panty combo',
    bangla: 'তিনটি পছন্দের প্যান্টি বেছে নিন, নিজের রঙ আর সাইজে।',
    lede: 'Pick any three styles, from lace and seamless to cotton, each in the colour and size you want. See the total before it goes in your cart.',
    cta: 'Build your combo',
    heroImages: [
      image('lace-brief-pink'),
      image('seamless-brief-beige'),
      image('lace-thong-skyblue'),
    ],
    pickerTitle: 'Pick your three',
    pickerHint: 'Choose a colour and size on a style, then add it to your combo.',
    benefits: [
      {
        icon: 'style',
        title: 'Mix your own three',
        text: 'Any three styles, in any colours. The same style twice is fine.',
      },
      {
        icon: 'checkroom',
        title: 'Lace, seamless, cotton',
        text: 'Brazilian, high-waist, no-show, bikini and thong shapes.',
      },
      {
        icon: 'straighten',
        title: 'Your size on every piece',
        text: 'Sizes run from XS to XXL depending on the style. Each piece has its own.',
      },
      {
        icon: 'payments',
        title: 'Cash on Delivery',
        text: 'Order from home and pay when it reaches you, anywhere in Bangladesh.',
      },
    ],
    showSizeGuide: false,
    faqs: [
      {
        q: 'Can I pick different colours and sizes in one combo?',
        a: 'Yes. Every piece in the combo has its own colour and its own size.',
      },
      {
        q: 'How is the combo priced?',
        a: 'The combo total is the price of the three pieces you chose, shown before you add it to the cart. Delivery is added at checkout.',
      },
    ],
  },

  nightwear: {
    slug: 'nightwear',
    path: '/lp/nightwear',
    mode: 'pick',
    comboSize: null,
    select: (p) => p.category === 'nightwear',
    seo: {
      title: 'Nightwear',
      description:
        'Satin cami and shorts sets and lace babydolls, soft and light to sleep in. Choose your ' +
        'colour and size, and pay cash on delivery anywhere in Bangladesh.',
    },
    eyebrow: 'Nightwear',
    headline: 'Nightwear made',
    headlineAccent: 'for sleeping in',
    bangla: 'আরামের ঘুমের জন্য নরম সাটিন আর লেসের নাইটওয়্যার।',
    lede: 'Lace-trimmed satin cami sets and sheer lace babydolls. Soft, light, and easy to sleep in. Pick your colour and size, and pay when it reaches you.',
    cta: 'Choose your set',
    heroImages: [image('nightset-rose'), image('nightset-purple'), image('babydoll-black')],
    pickerTitle: 'Pick your nightwear',
    pickerHint: 'Choose a colour and size, then order. You can add more than one.',
    benefits: [
      {
        icon: 'bedtime',
        title: 'Easy to sleep in',
        text: 'Smooth satin, a lace trim and an elastic waist: soft, light and relaxed.',
      },
      {
        icon: 'checkroom',
        title: 'Sets that match',
        text: 'A cami with matching shorts, or a lace babydoll that comes with its matching thong.',
      },
      {
        icon: 'palette',
        title: 'Colour and size, your way',
        text: 'Rose red, purple, black or wine, depending on the style.',
      },
      {
        icon: 'payments',
        title: 'Cash on Delivery',
        text: 'Order from home and pay when it reaches you, anywhere in Bangladesh.',
      },
    ],
    showSizeGuide: false,
    faqs: [
      {
        q: 'What comes in a set?',
        a: 'The satin sets are a cami and matching shorts. The lace babydoll comes with a matching lace thong.',
      },
      {
        q: 'Can I order more than one?',
        a: 'Yes. Add as many as you like to the cart and place one order. Each colour and size is its own line in the cart.',
      },
    ],
  },
};
