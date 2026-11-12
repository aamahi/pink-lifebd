/**
 * Shared shapes and geometry for the home hero's clothing rail.
 *
 * Ported from the React `ClothingRailHero` (21st.dev "product-rail-gallery").
 * Every constant below is that component's, unchanged -- the motion only looks
 * the same if the springs, the resting angle and the footprint maths are the
 * same numbers.
 *
 * Only the photo path is ported. The original also draws six garment kinds as
 * SVG when a piece has no photo; every piece on this rail has front, back and
 * side photos with the hanger in the shot, so that branch could never render
 * here and would be several hundred lines nothing reaches.
 */

export interface RailGarment {
  readonly id: string;
  /** Accessible name, caption and detail title. */
  readonly name: string;
  readonly description: string | null;
  /**
   * Hang-tag price in `SITE.currency`, formatted by `formatMoney`. `null` means
   * no tag, which is a different thing from a tag reading zero.
   */
  readonly price: number | null;
  /** Struck-through original price. null = not on offer, so no discount chip. */
  readonly compareAtPrice: number | null;
  /** Small label over the detail title ("New Arrival"); null for none. */
  readonly badge: string | null;
  /** Average out of 5. null = no rating, which hides the stars rather than showing none lit. */
  readonly rating: number | null;
  /** null = count not known; the rating then shows without "(n reviews)". */
  readonly reviewCount: number | null;
  /** Front photo: a transparent cut-out on a 200x310 portrait canvas. */
  readonly image: string;
  /** Back photo; the front is reused when null. Must share the front's canvas. */
  readonly backImage: string | null;
  /** Side-on photo shown at rest; when null the front photo turns away instead. */
  readonly sideImage: string | null;
  /** Colourways. The first is the one photographed, and is selected on open. */
  readonly colors: readonly RailColor[];
  /** Size labels in display order. "M" is selected on open when offered. */
  readonly sizes: readonly string[];
}

/**
 * What the detail panel reads: a rail piece, or a catalogue product dressed as
 * one on the product page, where the photo can be missing (the panel never
 * draws it; the page shows its own "No image" tile).
 */
export type DetailItem = Omit<RailGarment, 'image'> & { readonly image: string | null };

export interface RailColor {
  readonly name: string;
  /** Swatch fill, any CSS colour. */
  readonly swatch: string;
}

export interface RailLabels {
  readonly front: string;
  readonly back: string;
  readonly close: string;
  readonly show: string;
}

export const DEFAULT_LABELS: RailLabels = {
  front: 'Front',
  back: 'Back',
  close: 'Close',
  show: 'Show',
};

export const VB_W = 200;
export const VB_H = 310;
export const ASPECT = VB_W / VB_H;
/** Hook tip, in canvas units from the top: the point each piece swings about. */
export const HOOK_TOP = 4;
export const RAIL_R = 4.6;
/** Resting angle -- side-on to the visitor. A piece turned to the front is at 0. */
export const REST = -70;
export const PERSPECTIVE = 1100;
/** Space between neighbouring pieces, as a fraction of the piece height. */
export const GAP = 0.035;
export const MAX_H = 400;
/** Below this piece height the rail stops fitting and becomes a swipe carousel. */
export const MIN_WIDE_H = 200;
export const CAROUSEL_H = 340;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Lambert shading for a piece turned `angle` degrees, with the light up and to
 * the left. 1 is fully lit; the shade overlay paints `1 - lambert`.
 */
export function lambert(angle: number): number {
  const r = (angle * Math.PI) / 180;
  const diffuse = Math.max(0, Math.sin(r) * 0.42 + Math.cos(r) * 0.91);
  return 0.66 + 0.34 * diffuse;
}

/**
 * Horizontal room a piece of height `h` takes at `angle`. Interpolates with a
 * smoothstep between the side-on width (`sideW` of the canvas) and 94% of the
 * canvas when it faces front, so neighbours are pushed apart as it turns.
 */
export function footprint(h: number, angle: number, sideW = 0.4): number {
  const e = clamp(1 - angle / REST, 0, 1);
  const ease = e * e * (3 - 2 * e);
  return h * ASPECT * (sideW + (0.94 - sideW) * ease);
}

/** Side-on width as a fraction of the canvas: a real side photo is narrower. */
export function sideWidth(item: RailGarment): number {
  return item.sideImage ? 0.3 : 0.4;
}

/** CSS `mask` value that cuts a layer to the photo's own silhouette. */
export function photoMask(src: string): string {
  return `url("${src}") top center / contain no-repeat`;
}
