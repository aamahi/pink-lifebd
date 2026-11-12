/**
 * The ONE file a demo author edits to rebrand this template.
 *
 * Everything brand-shaped lives here or in `src/styles/theme.css`. Nothing else in
 * `src/app/` should contain a brand name, a phone number, a currency symbol, or a
 * locale string -- `DEMO-CHECKLIST.md` names both files and the check is a grep.
 */
/** One delivery band: where it applies and what it costs, in `SiteConfig.currency`. */
export interface DeliveryZone {
  /** Stable key stored on the order; never shown. */
  readonly id: string;
  readonly label: string;
  /** One line of examples, so a customer can tell which band their address falls in. */
  readonly hint: string;
  /** A real amount: a zone with free delivery is `0`, which is a fact, not a missing value. */
  readonly fee: number;
}

export interface SiteConfig {
  readonly name: string;
  readonly tagline: string;
  readonly description: string;

  /**
   * BCP-47 locale used for number and date formatting.
   *
   * `en-BD` is deliberate: it formats digits as ASCII while keeping the grouping a
   * Bangladeshi reader expects. `bn-BD` renders Bengali numerals, which is correct
   * for a Bengali-language demo and wrong for an English one -- switching the
   * language string without switching the copy produces a page that reads in
   * English with numerals most English readers cannot scan.
   */
  readonly locale: string;

  /** ISO 4217. Drives the symbol AND the fraction digits; they are not independent. */
  readonly currency: string;

  /**
   * IANA zone the site's dates are stated IN.
   *
   * Not the viewer's zone, on purpose. A store's opening hours and an order's
   * placed-at are facts about the store's zone; rendering them in the viewer's
   * shifts them by up to a day and nothing in the UI says it happened.
   */
  readonly timeZone: string;

  readonly contact: {
    readonly email: string;
    readonly phone: string;
    readonly address: string;
  };

  readonly social: ReadonlyArray<{ readonly label: string; readonly href: string }>;

  /**
   * What delivery costs, by area. The first zone is the one preselected, so put the most common
   * one first. The tuple type guarantees at least one zone, which is what lets the cart read a
   * default without a "what if there is none" branch.
   */
  readonly delivery: { readonly zones: readonly [DeliveryZone, ...DeliveryZone[]] };

  /**
   * Header logo. `src` is relative to `public/`. `alt` is the brand as the logo
   * spells it, which can differ from `name` while a fork is mid-rebrand. `srcOnDark` is the same
   * artwork recoloured for the dark footer.
   */
  readonly logo: { readonly src: string; readonly srcOnDark: string; readonly alt: string };
}

export const SITE: SiteConfig = {
  name: 'Pink Life',
  tagline: 'Lingerie and nightwear that feels as good as it looks.',
  description:
    'Pink Life: bras, panties and nightwear in soft lace and satin, made for comfort ' +
    'and confidence.',
  locale: 'en-BD',
  currency: 'BDT',
  timeZone: 'Asia/Dhaka',
  contact: {
    email: 'hello@example.com',
    phone: '+880 1000 000000',
    address: 'Dhaka, Bangladesh',
  },
  delivery: {
    zones: [
      { id: 'dhaka', label: 'Inside Dhaka', hint: 'Within Dhaka city', fee: 60 },
      {
        id: 'sub-dhaka',
        label: 'Sub-Dhaka',
        // Example areas only: confirm the real coverage with the client before this ships.
        hint: 'Savar, Gazipur, Narayanganj, Keraniganj',
        fee: 70,
      },
      {
        id: 'outside-dhaka',
        label: 'Outside Dhaka',
        hint: 'Everywhere else in Bangladesh',
        fee: 110,
      },
    ],
  },
  social: [
    { label: 'Instagram', href: 'https://instagram.com/' },
    { label: 'YouTube', href: 'https://youtube.com/' },
    { label: 'LinkedIn', href: 'https://linkedin.com/' },
    { label: 'Facebook', href: 'https://facebook.com/' },
  ],
  logo: {
    src: 'images/pink-life-logo-script.svg',
    srcOnDark: 'images/pink-life-logo-script-on-dark.svg',
    alt: 'Pink Life',
  },
};
