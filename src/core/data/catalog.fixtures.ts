import type { Category, Product, ProductColor } from '@/core/data/catalog.model';

/**
 * Fixture catalogue. This is what the demo shows when `environment.apiBaseUrl` is
 * empty, which is the default.
 *
 * Twelve bras (one of them a bra-and-brief set), six panties, three nightwear pieces and one
 * accessory, twenty-two rows in all. Every picture is a photograph the client supplied. The main
 * one is cut out of its backdrop onto the shop's 645x1000 transparent canvas
 * (`public/images/pink-life/photo-<name>-*.webp`; see `photo()` below) and the rest of the
 * listing's photographs, uncut, are the product page's gallery (`public/images/products/`; see
 * `gallery()` below). The rows are
 * still chosen to exercise the states a real catalogue hits and a hand-made fixture set
 * usually misses -- every one of these has produced a bug on a live storefront at some point:
 *
 *   - `price: null`            the coral push-up bra: a price the API did not return
 *   - `price: 0`               the wash bag: genuinely free, which must NOT read as missing
 *   - `stock: null`            stock not tracked (the platform default) -- most rows
 *   - `stock: 0`               the vanilla bralette: tracked and actually out
 *   - `image: null`            the wash bag, so the placeholder path gets exercised
 *   - `rating: null`           the strapless bra: unrated, distinct from rated zero
 *   - a very long name         the strapless bra again, so truncation and wrapping get exercised
 *
 * One missing image in twenty-two is the test `.claude/rules/demo-craft.md` rule 3 allows.
 *
 * Prices on the rows added with the nightwear range are placeholders in the shop's usual band, not
 * the client's price list. Replace them with real ones before this goes in front of customers.
 */
/*
 * Collections -- the header's Bras / Panties / Nightwear / New Collections -- are tags rather than
 * categories: a piece belongs to one category (what it is) but to any number of
 * collections (what it is for). The shop reads them as `?collection=<tag>`; see
 * `SHOP_COLLECTIONS` in `features/catalog/shop-filter.ts`.
 */
export const FIXTURE_CATEGORIES: readonly Category[] = [
  { slug: 'bras', name: 'Bras' },
  { slug: 'panties', name: 'Panties' },
  { slug: 'nightwear', name: 'Nightwear' },
  { slug: 'accessories', name: 'Accessories' },
];

const WINE: ProductColor = { name: 'Wine', swatch: '#7A1F33' };
const ROSE: ProductColor = { name: 'Rose', swatch: '#E27B9B' };
const MAGENTA: ProductColor = { name: 'Magenta', swatch: '#C2338A' };
const CORAL: ProductColor = { name: 'Coral', swatch: '#F2A58E' };
const BABY_PINK: ProductColor = { name: 'Baby Pink', swatch: '#F4C6D6' };
const VANILLA: ProductColor = { name: 'Vanilla', swatch: '#EBCFC2' };
const CREAM: ProductColor = { name: 'Cream', swatch: '#F3EDE4' };
const MOCHA: ProductColor = { name: 'Mocha', swatch: '#6E5A54' };
const NUDE: ProductColor = { name: 'Nude', swatch: '#D9C2B3' };
const WHITE: ProductColor = { name: 'White', swatch: '#F6EEF3' };
const BLACK: ProductColor = { name: 'Black', swatch: '#1A1517' };
const BLUSH: ProductColor = { name: 'Blush', swatch: '#F2B8C6' };
const POWDER_BLUE: ProductColor = { name: 'Powder Blue', swatch: '#AFC4E4' };
const SKY_BLUE: ProductColor = { name: 'Sky Blue', swatch: '#A9C9E8' };
const IVORY: ProductColor = { name: 'Ivory', swatch: '#EFE6D6' };
const BEIGE: ProductColor = { name: 'Beige', swatch: '#DDBFA9' };
const PINK: ProductColor = { name: 'Pink', swatch: '#E58FBF' };
const PURPLE: ProductColor = { name: 'Purple', swatch: '#8E2A78' };
const ROSE_RED: ProductColor = { name: 'Rose Red', swatch: '#D02A58' };

const BRA_SIZES = ['32B', '34B', '34C', '36C', '36D'] as const;
const BRIEF_SIZES = ['S', 'M', 'L', 'XL'] as const;

/**
 * One of the client's photographs, cut out of its backdrop (`-front`) and set on the same
 * 645x1000 canvas the shop card, the product viewer and the home rail all expect. Alongside it:
 * an edge-on `-side` (the front squeezed to a sliver, which is the rest pose of the turning
 * viewer), a narrow `-display` for the home Featured collection -- that carousel crops every
 * picture to a tall card, which would cut a flat-lay in half -- and, where a second
 * photograph of the piece exists, a `-back`.
 */
const photo = (name: string, back = false) => ({
  image: `images/pink-life/photo-${name}-front.webp`,
  backImage: back ? `images/pink-life/photo-${name}-back.webp` : null,
  sideImage: `images/pink-life/photo-${name}-side.webp`,
  modelImage: `images/pink-life/photo-${name}-display.webp`,
});

/**
 * The client's uncut photographs of one listing, `images/products/<slug>-1.webp` onwards, in the
 * order the product page's strip shows them. `count` must match the files on disk: a number that is
 * too high is a broken thumbnail in the strip, a number too low silently drops a photograph.
 */
const gallery = (slug: string, count: number): readonly string[] =>
  Array.from({ length: count }, (_, i) => `images/products/${slug}-${i + 1}.webp`);

/** A size guide picture, `images/products/size-chart-<name>.webp`. */
const sizeChart = (name: string): string => `images/products/size-chart-${name}.webp`;

export const FIXTURE_PRODUCTS: readonly Product[] = [
  {
    id: '1',
    slug: 'molded-tshirt-bra-wine',
    name: 'Molded T-Shirt Bra',
    summary: 'Smooth ribbed cups with wide straps and a soft, flat underband.',
    description:
      'A wire-free moulded bra in a fine ribbed knit, with seamless cups that disappear under ' +
      'fitted tops, wide adjustable straps and a soft underband for all-day wear.',
    category: 'bras',
    price: 1650,
    compareAtPrice: null,
    ...photo('tshirt-bra-wine'),
    gallery: gallery('molded-tshirt-bra-wine', 1),
    sizeChart: null,
    rating: 4.6,
    reviewCount: 94,
    stock: null,
    tags: ['bestseller', 'bras', 'new'],
    updatedAt: '2026-10-25T09:30:00Z',
    badge: 'New',
    sizes: BRA_SIZES,
    colors: [WINE, NUDE, BLACK],
  },
  {
    id: '2',
    slug: 'lace-brazilian-brief-pink',
    name: 'Lace Brazilian Brief',
    summary: 'A soft floral-lace brief with scalloped leg edges.',
    description:
      'A brazilian-cut brief in stretch floral lace with scalloped leg edges and a soft ' +
      'cotton-lined gusset.',
    category: 'panties',
    price: 690,
    compareAtPrice: null,
    ...photo('lace-brief-pink'),
    gallery: gallery('lace-brazilian-brief-pink', 3),
    sizeChart: null,
    rating: 4.5,
    reviewCount: 52,
    stock: null,
    tags: ['panties', 'new'],
    updatedAt: '2026-10-11T16:45:00Z',
    badge: null,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [ROSE, BLACK, WHITE],
  },
  {
    id: '3',
    slug: 'seamless-high-waist-brief-mocha',
    name: 'Seamless High-Waist Brief',
    summary: 'A smooth, bonded-edge brief that sits flat under fitted clothes.',
    description:
      'A high-waist brief with laser-cut, bonded edges that stay invisible under clothes, in a ' +
      'smooth stretch fabric that moves with you.',
    category: 'panties',
    price: 590,
    compareAtPrice: null,
    ...photo('seamless-brief-mocha', true),
    gallery: gallery('seamless-high-waist-brief-mocha', 2),
    sizeChart: null,
    rating: 4.6,
    reviewCount: 73,
    stock: 6,
    tags: ['bestseller', 'panties'],
    updatedAt: '2026-09-22T09:00:00Z',
    badge: null,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [MOCHA, NUDE, BLACK],
  },
  {
    id: '4',
    slug: 'seamless-no-show-brief-nude',
    name: 'No-Show Seamless Brief',
    summary: 'A laser-cut, no-show brief that stays put all day.',
    description:
      'A seamless mid-rise brief with raw, laser-cut edges that leave no lines under fitted ' +
      'clothes, in a soft stretch fabric.',
    category: 'panties',
    price: 490,
    compareAtPrice: null,
    ...photo('seamless-brief-beige'),
    gallery: gallery('seamless-no-show-brief-nude', 1),
    sizeChart: null,
    rating: 4.4,
    reviewCount: 88,
    stock: null,
    tags: ['panties'],
    updatedAt: '2026-07-22T09:00:00Z',
    badge: null,
    sizes: BRIEF_SIZES,
    colors: [NUDE, MOCHA, BLACK],
  },
  {
    id: '5',
    slug: 'cotton-bikini-brief-magenta',
    name: 'Cotton Bikini Brief',
    summary: 'Breathable stretch cotton in a classic low-rise cut.',
    description:
      'A classic bikini brief in breathable stretch cotton, with flat-stitched leg openings and ' +
      'a soft cotton gusset.',
    category: 'panties',
    price: 450,
    compareAtPrice: null,
    ...photo('cotton-brief-magenta'),
    gallery: gallery('cotton-bikini-brief-magenta', 2),
    sizeChart: null,
    rating: 4.3,
    reviewCount: 41,
    stock: null,
    tags: ['panties'],
    updatedAt: '2026-08-14T08:00:00Z',
    badge: null,
    sizes: BRIEF_SIZES,
    colors: [MAGENTA, BLACK, WHITE],
  },
  {
    id: '6',
    slug: 'strapless-multiway-push-up-bra-cream',
    name: 'Strapless Multiway Push-Up Bra with Detachable Straps and Soft Satin-Feel Cups',
    summary: 'A gathered-front strapless bra with straps you can wear or remove.',
    description:
      'A strapless push-up bra with a gathered centre front, silicone-lined edges that grip ' +
      'without slipping, and detachable straps to wear it crossed, halter or straight.',
    category: 'bras',
    price: 2450,
    compareAtPrice: null,
    ...photo('strapless-bra-cream'),
    gallery: gallery('strapless-multiway-push-up-bra-cream', 1),
    sizeChart: null,
    rating: null,
    reviewCount: null,
    stock: null,
    tags: ['bras'],
    updatedAt: '2026-06-28T12:30:00Z',
    badge: null,
    sizes: BRA_SIZES,
    colors: [CREAM, BLACK, NUDE],
  },
  {
    id: '7',
    slug: 'ribbed-wireless-bralette-vanilla',
    name: 'Ribbed Wireless Bralette',
    summary: 'A ribbed bralette with a mesh panel and adjustable straps.',
    description:
      'A wire-free bralette in a fine ribbed fabric with a sheer mesh V panel, removable pads, ' +
      'slim adjustable straps and a soft stretch band. A limited colour while stocks last.',
    category: 'bras',
    price: 2650,
    compareAtPrice: 3250,
    ...photo('ribbed-bralette-vanilla'),
    gallery: gallery('ribbed-wireless-bralette-vanilla', 1),
    sizeChart: null,
    rating: 4.9,
    reviewCount: 37,
    stock: 0,
    tags: ['bras'],
    updatedAt: '2026-09-05T14:00:00Z',
    badge: 'Limited',
    sizes: BRIEF_SIZES,
    colors: [VANILLA, BLACK],
  },
  {
    id: '8',
    slug: 'mesh-panel-comfort-bra-baby-pink',
    name: 'Mesh-Panel Comfort Bra',
    summary: 'A soft wire-free bra with breathable mesh panels.',
    description:
      'A wire-free everyday bra with lightly padded cups, breathable mesh side panels, ' +
      'adjustable straps and a hook-and-eye back.',
    category: 'bras',
    price: 1350,
    compareAtPrice: null,
    ...photo('mesh-bra-babypink', true),
    gallery: gallery('mesh-panel-comfort-bra-baby-pink', 2),
    sizeChart: null,
    rating: 4.7,
    reviewCount: 61,
    stock: null,
    tags: ['bestseller', 'bras'],
    updatedAt: '2026-08-30T08:15:00Z',
    badge: null,
    sizes: BRA_SIZES,
    colors: [BABY_PINK, NUDE, BLACK],
  },
  {
    id: '9',
    slug: 'padded-push-up-bra-coral',
    name: 'Padded Push-Up Bra',
    summary: 'Lightly lined cups with a satin bow and adjustable straps.',
    description:
      'An underwired push-up bra with smooth, lightly padded cups, a small satin bow at the ' +
      'centre front, a scalloped underband edge and fully adjustable straps.',
    category: 'bras',
    price: null,
    compareAtPrice: null,
    ...photo('pushup-bra-coral'),
    gallery: gallery('padded-push-up-bra-coral', 3),
    sizeChart: null,
    rating: 4.7,
    reviewCount: 45,
    stock: null,
    tags: ['bestseller', 'bras'],
    updatedAt: '2026-09-27T13:10:00Z',
    badge: 'Bestseller',
    sizes: BRA_SIZES,
    colors: [CORAL, BLACK, NUDE],
  },
  {
    id: '10',
    slug: 'lingerie-wash-bag',
    name: 'Lingerie Wash Bag',
    summary: 'Free with any order over the threshold.',
    description:
      'A fine mesh wash bag that protects underwires and lace in the machine, free with ' +
      'qualifying orders while stocks last.',
    category: 'accessories',
    price: 0,
    compareAtPrice: null,
    image: null,
    backImage: null,
    sideImage: null,
    modelImage: null,
    gallery: [],
    sizeChart: null,
    rating: 4.2,
    reviewCount: 19,
    stock: 120,
    tags: ['free', 'promo'],
    updatedAt: '2026-08-01T07:00:00Z',
    badge: 'Free',
    sizes: [],
    colors: [BLUSH],
  },
  {
    id: '11',
    slug: 'super-comfy-seamless-bra-baby-pink',
    name: 'Super-Comfy Seamless Bra',
    summary: 'Smooth seamless cups with a clean, lineless finish.',
    description:
      'A seamless moulded bra with smooth, lightly padded cups that leave no lines under fitted ' +
      'tops, slim adjustable straps and a hook-and-eye back. Sized S to XL; the size guide shows ' +
      'the cup range each size covers.',
    category: 'bras',
    price: 1250,
    compareAtPrice: null,
    ...photo('candy-bra-babypink', true),
    gallery: gallery('super-comfy-seamless-bra-baby-pink', 3),
    sizeChart: sizeChart('super-comfy-seamless-bra'),
    rating: 4.5,
    reviewCount: 38,
    stock: null,
    tags: ['bras', 'new'],
    updatedAt: '2026-11-02T10:00:00Z',
    badge: 'New',
    sizes: BRIEF_SIZES,
    colors: [BABY_PINK, NUDE, BLACK],
  },
  {
    id: '12',
    slug: 'ribbed-teen-bra-powder-blue',
    name: 'Ribbed Teen Bra',
    summary: 'A soft ribbed bra with a twist at the centre front, made for first bras.',
    description:
      'A soft bra in a fine ribbed fabric with a gathered twist at the centre front, slim ' +
      'adjustable straps and a hook-and-eye back. Gently supportive and easy to wear all day, ' +
      'cut for a first bra.',
    category: 'bras',
    price: 890,
    compareAtPrice: null,
    ...photo('princess-bra-blue'),
    gallery: gallery('ribbed-teen-bra-powder-blue', 3),
    sizeChart: null,
    rating: 4.6,
    reviewCount: 29,
    stock: null,
    tags: ['bras'],
    updatedAt: '2026-10-28T09:00:00Z',
    badge: null,
    sizes: ['28B', '30B', '32B', '34B'],
    colors: [POWDER_BLUE, BABY_PINK, WHITE],
  },
  {
    id: '13',
    slug: 'chikan-cotton-bra-beige',
    name: 'Double-Layered Chikan Cotton Bra',
    summary: 'A full-coverage cotton bra with chikan embroidery across the cups.',
    description:
      'A full-coverage bra in double-layered soft cotton, with chikan-style embroidery over the ' +
      'cups, a smooth elastic underband and adjustable straps. Breathable enough for all-day ' +
      'wear in a warm climate. Also in pink.',
    category: 'bras',
    price: 790,
    compareAtPrice: null,
    ...photo('chikan-bra-beige'),
    gallery: gallery('chikan-cotton-bra-beige', 3),
    sizeChart: null,
    rating: 4.4,
    reviewCount: 57,
    stock: null,
    tags: ['bestseller', 'bras'],
    updatedAt: '2026-10-19T09:00:00Z',
    badge: null,
    sizes: ['32B', '34B', '36B', '38B', '40B'],
    colors: [BEIGE, PINK, WHITE],
  },
  {
    id: '14',
    slug: 'chikan-cotton-bra-pink',
    name: 'Double-Layered Chikan Cotton Bra',
    summary: 'A full-coverage cotton bra with chikan embroidery across the cups.',
    description:
      'A full-coverage bra in double-layered soft cotton, with chikan-style embroidery over the ' +
      'cups, a smooth elastic underband and adjustable straps. Breathable enough for all-day ' +
      'wear in a warm climate. Also in beige.',
    category: 'bras',
    price: 790,
    compareAtPrice: null,
    ...photo('chikan-bra-pink'),
    gallery: gallery('chikan-cotton-bra-pink', 3),
    sizeChart: null,
    rating: 4.5,
    reviewCount: 43,
    stock: null,
    tags: ['bras'],
    updatedAt: '2026-10-19T09:30:00Z',
    badge: null,
    sizes: ['32B', '34B', '36B', '38B', '40B'],
    colors: [PINK, BEIGE, WHITE],
  },
  {
    id: '15',
    slug: 'comfy-wireless-t-shirt-bra-wine',
    name: 'Comfy Wireless T-Shirt Bra',
    summary: 'Smooth padded cups with a small bow and fully adjustable straps.',
    description:
      'A wire-free T-shirt bra with smooth, lightly padded cups, a small bow at the centre front ' +
      'and fully adjustable straps, in a deep wine with an even, matte finish.',
    category: 'bras',
    price: 1450,
    compareAtPrice: null,
    ...photo('comfy-bra-wine'),
    gallery: gallery('comfy-wireless-t-shirt-bra-wine', 5),
    sizeChart: null,
    rating: 4.7,
    reviewCount: 82,
    stock: null,
    tags: ['bestseller', 'bras'],
    updatedAt: '2026-10-30T11:00:00Z',
    badge: null,
    sizes: BRA_SIZES,
    colors: [WINE, NUDE, BLACK],
  },
  {
    id: '16',
    slug: 'lacy-t-shirt-wired-bra-beige',
    name: 'Lacy T-Shirt Wired Bra',
    summary: 'Lace-overlay cups on an underwire, for lift and a smooth shape.',
    description:
      'An underwired T-shirt bra with floral lace over smooth, lined cups, adjustable straps and ' +
      'a hook-and-eye back. Sizes run 34B to 38C; the size guide gives the matching Chinese ' +
      'label for each.',
    category: 'bras',
    price: 1850,
    compareAtPrice: null,
    ...photo('lacy-wired-bra-beige', true),
    gallery: gallery('lacy-t-shirt-wired-bra-beige', 2),
    sizeChart: sizeChart('lacy-t-shirt-wired-bra'),
    rating: 4.6,
    reviewCount: 47,
    stock: null,
    tags: ['bras', 'new'],
    updatedAt: '2026-11-01T09:00:00Z',
    badge: 'New',
    sizes: ['34B', '34C', '36B', '36C', '38B', '38C'],
    colors: [IVORY, BLACK, NUDE],
  },
  {
    id: '17',
    slug: 'lace-bra-and-brief-set-rose',
    name: 'Lace Bra & Brief Set',
    summary: 'A wired lace bra with a matching mesh-panel brief.',
    description:
      'A matching set: an underwired bra in embroidered pink lace with adjustable straps, and a ' +
      'brief with a sheer mesh front and lace trim. Wear them together or on their own.',
    category: 'bras',
    price: 2350,
    compareAtPrice: 2750,
    ...photo('lovebirds-set-pink'),
    gallery: gallery('lace-bra-and-brief-set-rose', 7),
    sizeChart: null,
    rating: 4.8,
    reviewCount: 33,
    stock: null,
    tags: ['bestseller', 'bras', 'panties'],
    updatedAt: '2026-10-22T14:00:00Z',
    badge: 'Set',
    sizes: ['32B', '34B', '34C', '36B', '36C'],
    colors: [ROSE, BLACK, NUDE],
  },
  {
    id: '18',
    slug: 'floral-lace-thong-sky-blue',
    name: 'Low-Waist Floral Lace Thong',
    summary: 'A breathable low-waist thong with floral lace panels.',
    description:
      'A low-rise thong with floral lace at the sides and back, a small satin bow at the waist ' +
      'and a soft stretch waistband.',
    category: 'panties',
    price: 390,
    compareAtPrice: null,
    ...photo('lace-thong-skyblue'),
    gallery: gallery('floral-lace-thong-sky-blue', 1),
    sizeChart: null,
    rating: 4.3,
    reviewCount: 24,
    stock: null,
    tags: ['panties'],
    updatedAt: '2026-10-08T09:00:00Z',
    badge: null,
    sizes: ['S', 'M', 'L'],
    colors: [SKY_BLUE, BLACK, WHITE],
  },
  {
    id: '19',
    slug: 'stretch-lace-thong-black',
    name: 'Stretch Lace Thong',
    summary: 'A stretchy all-over lace thong, in black, blush and wine.',
    description:
      'A low-rise thong in soft stretch lace with scalloped edges, light enough to disappear ' +
      'under fitted clothes. Shown in black, blush and wine.',
    category: 'panties',
    price: 420,
    compareAtPrice: null,
    ...photo('lace-thong-black'),
    gallery: gallery('stretch-lace-thong-black', 2),
    sizeChart: null,
    rating: 4.5,
    reviewCount: 36,
    stock: null,
    tags: ['panties', 'new'],
    updatedAt: '2026-10-26T09:00:00Z',
    badge: null,
    sizes: ['S', 'M', 'L'],
    colors: [BLACK, BLUSH, WINE],
  },
  {
    id: '20',
    slug: 'satin-nightwear-set-purple',
    name: 'Satin Cami & Shorts Set',
    summary: 'A lace-trimmed satin cami with matching shorts.',
    description:
      'A two-piece nightwear set in smooth satin: a cami with a lace-trimmed neckline and a ' +
      'lace-up front, and relaxed shorts with a lace hem and an elastic waist. Soft, light and ' +
      'easy to sleep in. Also in rose red.',
    category: 'nightwear',
    price: 1650,
    compareAtPrice: null,
    ...photo('nightset-purple'),
    gallery: gallery('satin-nightwear-set-purple', 3),
    sizeChart: null,
    rating: 4.7,
    reviewCount: 51,
    stock: null,
    tags: ['bestseller', 'nightwear', 'new'],
    updatedAt: '2026-11-03T09:00:00Z',
    badge: 'New',
    sizes: BRIEF_SIZES,
    colors: [PURPLE, ROSE_RED, BLACK],
  },
  {
    id: '21',
    slug: 'satin-nightwear-set-rose',
    name: 'Satin Cami & Shorts Set',
    summary: 'A lace-trimmed satin cami with matching shorts.',
    description:
      'A two-piece nightwear set in smooth satin: a cami with a lace-trimmed neckline and a ' +
      'lace-up front, and relaxed shorts with a lace hem and an elastic waist. Soft, light and ' +
      'easy to sleep in. Also in purple.',
    category: 'nightwear',
    price: 1650,
    compareAtPrice: null,
    ...photo('nightset-rose'),
    gallery: gallery('satin-nightwear-set-rose', 5),
    sizeChart: null,
    rating: 4.8,
    reviewCount: 64,
    stock: null,
    tags: ['bestseller', 'nightwear', 'new'],
    updatedAt: '2026-11-03T09:30:00Z',
    badge: 'New',
    sizes: BRIEF_SIZES,
    colors: [ROSE_RED, PURPLE, BLACK],
  },
  {
    id: '22',
    slug: 'lace-babydoll-set-black',
    name: 'Lace Babydoll Set',
    summary: 'A sheer black lace babydoll with a matching thong.',
    description:
      'A babydoll in black floral lace over a soft pink lining, with a lace-trimmed neckline, a ' +
      'small bow at the bust, adjustable straps and a scalloped lace hem. Comes with a matching ' +
      'lace thong.',
    category: 'nightwear',
    price: 2250,
    compareAtPrice: null,
    ...photo('babydoll-black'),
    gallery: gallery('lace-babydoll-set-black', 2),
    sizeChart: null,
    rating: 4.6,
    reviewCount: 28,
    stock: null,
    tags: ['nightwear', 'new'],
    updatedAt: '2026-11-04T09:00:00Z',
    badge: 'New',
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: [BLACK, WINE],
  },
];
