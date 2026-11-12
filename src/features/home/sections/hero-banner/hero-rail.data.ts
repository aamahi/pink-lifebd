import type { RailColor, RailGarment } from './rail.model';

/**
 * A rail piece plus what the home hero showcase needs: the catalogue product it is (so the
 * hero can link to its page) and the cut-out cropped tight to the garment.
 */
export interface HeroPiece extends RailGarment {
  /** `slug` of the catalogue product this piece is. */
  readonly slug: string;
  /** The cut-out cropped to the garment, with no canvas padding. */
  readonly heroImage: string;
}

/**
 * One of the client's photographs, cut out of its backdrop onto the rail's 645x1000
 * transparent canvas (`public/images/pink-life/photo-<name>-*.webp`; the same helper, with the
 * same files, is in `catalog.fixtures.ts`). `-side` is the front squeezed to a sliver, the
 * rail's rest pose; `back` adds a second photograph of the piece where one exists.
 */
const photo = (name: string, back = false) => ({
  image: `images/pink-life/photo-${name}-front.webp`,
  backImage: back ? `images/pink-life/photo-${name}-back.webp` : null,
  sideImage: `images/pink-life/photo-${name}-side.webp`,
  heroImage: `images/pink-life/photo-${name}-hero.webp`,
});

const BRA_SIZES = ['32B', '34B', '34C', '36C', '36D'] as const;
const BRIEF_SIZES = ['S', 'M', 'L', 'XL'] as const;

const WINE: RailColor = { name: 'Wine', swatch: '#7A1F33' };
const ROSE: RailColor = { name: 'Rose', swatch: '#E27B9B' };
const MAGENTA: RailColor = { name: 'Magenta', swatch: '#C2338A' };
const CORAL: RailColor = { name: 'Coral', swatch: '#F2A58E' };
const BABY_PINK: RailColor = { name: 'Baby Pink', swatch: '#F4C6D6' };
const VANILLA: RailColor = { name: 'Vanilla', swatch: '#EBCFC2' };
const CREAM: RailColor = { name: 'Cream', swatch: '#F3EDE4' };
const MOCHA: RailColor = { name: 'Mocha', swatch: '#6E5A54' };
const NUDE: RailColor = { name: 'Nude', swatch: '#D9C2B3' };
const WHITE: RailColor = { name: 'White', swatch: '#F6EEF3' };
const BLACK: RailColor = { name: 'Black', swatch: '#1A1517' };

/**
 * The nine pieces on the home hero's rail, in hanging order -- the catalogue's photographed
 * products.
 *
 * Prices are in `SITE.currency` and only ever reach the page through `formatMoney`. Only the
 * first colour of each piece is photographed; the others change the label and what goes in the
 * cart, not the picture.
 *
 * The strapless bra carries no rating and the no-show brief no badge or offer on purpose, so
 * the detail panel's absent branches stay on screen in a demo.
 */
export const HERO_RAIL_ITEMS: readonly HeroPiece[] = [
  {
    id: 'tshirt-bra-wine',
    slug: 'molded-tshirt-bra-wine',
    name: 'Molded T-shirt bra · Wine',
    badge: 'New Arrival',
    price: 1650,
    compareAtPrice: null,
    rating: 4.6,
    reviewCount: 94,
    description: 'Smooth ribbed cups with wide straps and a soft, flat underband.',
    colors: [WINE, NUDE, BLACK],
    sizes: BRA_SIZES,
    ...photo('tshirt-bra-wine'),
  },
  {
    id: 'lace-brief-pink',
    slug: 'lace-brazilian-brief-pink',
    name: 'Lace brazilian brief · Rose',
    badge: null,
    price: 690,
    compareAtPrice: null,
    rating: 4.5,
    reviewCount: 52,
    description: 'A soft floral-lace brief with scalloped leg edges.',
    colors: [ROSE, BLACK, WHITE],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    ...photo('lace-brief-pink'),
  },
  {
    id: 'pushup-bra-coral',
    slug: 'padded-push-up-bra-coral',
    name: 'Padded push-up bra · Coral',
    badge: 'Bestseller',
    price: null,
    compareAtPrice: null,
    rating: 4.7,
    reviewCount: 45,
    description: 'Lightly lined cups with a satin bow and adjustable straps.',
    colors: [CORAL, BLACK, NUDE],
    sizes: BRA_SIZES,
    ...photo('pushup-bra-coral'),
  },
  {
    id: 'seamless-brief-mocha',
    slug: 'seamless-high-waist-brief-mocha',
    name: 'Seamless high-waist brief · Mocha',
    badge: null,
    price: 590,
    compareAtPrice: null,
    rating: 4.6,
    reviewCount: 73,
    description: 'A smooth, bonded-edge brief that sits flat under fitted clothes.',
    colors: [MOCHA, NUDE, BLACK],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    ...photo('seamless-brief-mocha', true),
  },
  {
    id: 'strapless-bra-cream',
    slug: 'strapless-multiway-push-up-bra-cream',
    name: 'Strapless multiway push-up bra · Cream',
    badge: null,
    price: 2450,
    compareAtPrice: null,
    rating: null,
    reviewCount: null,
    description: 'A gathered-front strapless bra with straps you can wear or remove.',
    colors: [CREAM, BLACK, NUDE],
    sizes: BRA_SIZES,
    ...photo('strapless-bra-cream'),
  },
  {
    id: 'mesh-bra-babypink',
    slug: 'mesh-panel-comfort-bra-baby-pink',
    name: 'Mesh-panel comfort bra · Baby Pink',
    badge: 'Bestseller',
    price: 1350,
    compareAtPrice: null,
    rating: 4.7,
    reviewCount: 61,
    description: 'A soft wire-free bra with breathable mesh panels.',
    colors: [BABY_PINK, NUDE, BLACK],
    sizes: BRA_SIZES,
    ...photo('mesh-bra-babypink', true),
  },
  {
    id: 'cotton-brief-magenta',
    slug: 'cotton-bikini-brief-magenta',
    name: 'Cotton bikini brief · Magenta',
    badge: null,
    price: 450,
    compareAtPrice: null,
    rating: 4.3,
    reviewCount: 41,
    description: 'Breathable stretch cotton in a classic low-rise cut.',
    colors: [MAGENTA, BLACK, WHITE],
    sizes: BRIEF_SIZES,
    ...photo('cotton-brief-magenta'),
  },
  {
    id: 'ribbed-bralette-vanilla',
    slug: 'ribbed-wireless-bralette-vanilla',
    name: 'Ribbed wireless bralette · Vanilla',
    badge: 'Sale',
    price: 2650,
    compareAtPrice: 3250,
    rating: 4.9,
    reviewCount: 37,
    description: 'A ribbed bralette with a mesh panel and adjustable straps.',
    colors: [VANILLA, BLACK],
    sizes: BRIEF_SIZES,
    ...photo('ribbed-bralette-vanilla'),
  },
  {
    id: 'seamless-brief-beige',
    slug: 'seamless-no-show-brief-nude',
    name: 'No-show seamless brief · Nude',
    badge: null,
    price: 490,
    compareAtPrice: null,
    rating: 4.4,
    reviewCount: 88,
    description: 'A laser-cut, no-show brief that stays put all day.',
    colors: [NUDE, MOCHA, BLACK],
    sizes: BRIEF_SIZES,
    ...photo('seamless-brief-beige'),
  },
];
