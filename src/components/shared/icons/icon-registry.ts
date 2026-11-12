/**
 * Glyph data for {@link Icon} — a small, self-authored registry, deliberately not a wrapper
 * around a per-icon component library.
 *
 * Ticket #936 names the failure this replaces: the FontAwesome per-component-import pattern
 * produces no shared surface, and the source storefront ended up with 25 hand-authored inline-SVG
 * icon components as a result -- one file per glyph, no registry, no fallback. The pattern here is
 * the one already proven in the admin panel (`admin/src/app/shared/icons`): a handful of
 * hand-drawn glyphs for the shapes this template actually uses, backed by self-hosted Material
 * Symbols (the `material-symbols` dependency, already in `package.json`) for everything else.
 * Self-hosted rather than a CDN `<link>` for the same reason the fonts are self-hosted --
 * a Google-CDN QUIC interception once took every CDN-loaded icon down with the fonts it shared a
 * host with.
 *
 * Data, not drawings: every glyph is a list of `<path>`s (plus, for `cart`, two `<circle>`s for
 * the wheels) over a square grid, painted in `currentColor`. Seven entries, chosen to cover what
 * the template exercises -- search, a dismiss control, a disclosure chevron, a confirmation check,
 * a rating star, a cart glyph and a back arrow -- not an attempt to pre-populate every icon a fork
 * might eventually want. `Icon` falls back to the Material Symbols ligature for any name that is
 * not one of these, so a page is never blocked on this list being exhaustive.
 */

/** One `<path>` in a glyph, stroked in `currentColor` unless `fill` says otherwise. */
export interface IconShape {
  readonly d: string;
  /** Filled in `currentColor` with no stroke (the star), rather than stroke-drawn like the rest. */
  readonly fill?: boolean;
  /** `fill-rule`/`clip-rule="evenodd"` — a path that encloses a hole. */
  readonly evenOdd?: boolean;
}

/** One `<circle>` in a glyph — the cart's wheels are the only current user. */
export interface IconCircle {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly fill?: boolean;
}

export interface IconDef {
  /** The authored square grid — `24` means `viewBox="0 0 24 24"`. Also the default drawn size. */
  readonly grid: number;
  /** Authored stroke width in user space. Applies to every non-filled shape and circle. */
  readonly stroke?: number;
  readonly shapes?: readonly IconShape[];
  readonly circles?: readonly IconCircle[];
}

export const ICONS = {
  close: {
    grid: 24,
    stroke: 1.5,
    shapes: [{ d: 'M18 6 6 18M6 6l12 12' }],
  },
  'chevron-down': {
    grid: 24,
    stroke: 1.5,
    shapes: [{ d: 'M6 9l6 6 6-6' }],
  },
  check: {
    grid: 24,
    stroke: 1.5,
    shapes: [{ d: 'M5 13l4 4L19 7' }],
  },
  search: {
    grid: 24,
    stroke: 1.5,
    shapes: [{ d: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z' }, { d: 'M20 20l-4.35-4.35' }],
  },
  star: {
    grid: 24,
    shapes: [
      {
        d: 'M12 2.5l2.6 5.9 6.4.6-4.9 4.3 1.5 6.3L12 16.9 6.4 19.6l1.5-6.3-4.9-4.3 6.4-.6L12 2.5Z',
        fill: true,
      },
    ],
  },
  cart: {
    grid: 24,
    stroke: 1.5,
    shapes: [{ d: 'M3 4h2l2.2 10.5a2 2 0 0 0 2 1.6h7a2 2 0 0 0 2-1.6L20 8H6.2' }],
    circles: [
      { cx: 9, cy: 19, r: 1.3, fill: true },
      { cx: 17, cy: 19, r: 1.3, fill: true },
    ],
  },
  /**
   * Added for the navigation contract (ecom-fullstack#82) -- `BackLink`
   * is the only current caller. Registered here, not drawn inline in that
   * component, for the same reason the other six are: one shared registry
   * rather than a per-component inline SVG.
   */
  'arrow-left': {
    grid: 24,
    stroke: 1.5,
    shapes: [{ d: 'M19 12H5M12 19l-7-7 7-7' }],
  },
} as const satisfies Record<string, IconDef>;

/** Every glyph the registry carries. `Icon` checks its `name` prop against this. */
export type IconName = keyof typeof ICONS;
