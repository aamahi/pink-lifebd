/**
 * The demo's one domain type.
 *
 * Every field the UI can be missing is `| null`, NOT optional-and-defaulted. That is
 * deliberate: a field typed `price: number` forces whoever wires a real API to pick
 * a value when the API omits it, and the value they pick is 0. Typing it
 * `price: number | null` makes the absence survive as far as the template, where
 * `formatMoney` renders it as unavailable. See `core/utils/money.ts`.
 */
export interface Product {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly category: string;
  /** null = the API did not state a price. Never coerce this to 0. */
  readonly price: number | null;
  /** Struck-through original price. null = not on offer. */
  readonly compareAtPrice: number | null;
  readonly image: string | null;
  /**
   * The same garment from behind and side-on, on the front photo's canvas, for
   * the shop card's hover turn. null = not photographed; the turn then shows the
   * front throughout rather than an empty back.
   */
  readonly backImage: string | null;
  readonly sideImage: string | null;
  /**
   * The product worn: a full-length model shot on a white studio background,
   * about 2:3. The home "Featured collection" shows it when there is one and
   * falls back to `image` (the garment on its hanger) when there is not.
   */
  readonly modelImage: string | null;
  /**
   * The product's own photographs as supplied -- on the shelf, in the hand, close up -- shown as a
   * strip under the product page's viewer. Empty = none, so the strip is not rendered at all.
   */
  readonly gallery: readonly string[];
  /** A size guide picture. null = the product has none, so no "Size guide" section. */
  readonly sizeChart: string | null;
  readonly rating: number | null;
  /** How many reviews `rating` averages. null = not known, so no "(n reviews)". */
  readonly reviewCount: number | null;
  /**
   * null = this deployment does not track stock, which is the DEFAULT on the house
   * platform and the opposite of what the field name suggests. A null must render
   * as "no stock information", never as "out of stock" -- an untracked product is
   * orderable.
   */
  readonly stock: number | null;
  readonly tags: readonly string[];
  readonly updatedAt: string;
  /** Small label over the name on a card ("New", "Bestseller"). null = none. */
  readonly badge: string | null;
  /** Size labels in display order. Empty = one size, so no size filter applies. */
  readonly sizes: readonly string[];
  /** Colourways in display order; the first is the one photographed. */
  readonly colors: readonly ProductColor[];
}

export interface ProductColor {
  readonly name: string;
  /** Swatch fill, any CSS colour. */
  readonly swatch: string;
}

export interface Category {
  readonly slug: string;
  readonly name: string;
}
