'use client';

import { useEffect, useRef, useState } from 'react';
import type { Category, ProductColor } from '@/core/data/catalog.model';
import { cn } from '@/core/utils/cn';
import { formatMoney } from '@/core/utils/money';
import type { Facet } from '@/features/catalog/shop-filter';

export interface PriceChange {
  readonly min: number | null;
  readonly max: number | null;
}

/** Native checkbox restyled as the reference's square box: white, black when ticked. */
const BOX =
  'peer size-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border border-(--color-rail-border) bg-(--color-rail-bg) outline-none transition-colors checked:border-(--color-rail-fg) checked:bg-(--color-rail-fg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-1';

/** Both range inputs share one track; only their thumbs take the pointer. */
const THUMB =
  'pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-(--color-rail-fg) [&::-moz-range-thumb]:bg-(--color-rail-bg) [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-(--color-rail-fg) [&::-webkit-slider-thumb]:bg-(--color-rail-bg) focus-visible:outline-none [&:focus-visible::-webkit-slider-thumb]:ring-2 [&:focus-visible::-webkit-slider-thumb]:ring-(--color-rail-ring)';

const STEP = 50;

/** Colours listed before "Show all"; a ticked colour is always listed. */
const COLOR_LIMIT = 6;

/** The tick drawn over a ticked box; `peer-checked` shows it once the sibling input is checked. */
function Tick() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="pointer-events-none absolute hidden size-3 text-(--color-rail-bg) peer-checked:block"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

export interface ShopFiltersProps {
  readonly categories: readonly Category[];
  readonly sizes: readonly string[];
  readonly colors: readonly ProductColor[];
  readonly counts: Record<Facet, ReadonlyMap<string, number>>;
  readonly selectedCategories: readonly string[];
  readonly selectedSizes: readonly string[];
  readonly selectedColors: readonly string[];
  /** The slider's full span, and the bounds currently applied (null = open). */
  readonly lo: number;
  readonly hi: number;
  readonly min: number | null;
  readonly max: number | null;
  readonly onFacetToggle?: (change: { facet: Facet; value: string }) => void;
  readonly onPrice?: (change: PriceChange) => void;
  readonly onResetAll?: () => void;
}

/**
 * The shop's filter column: Category, Size and Colour as checkbox lists with
 * live counts, and a two-thumb price range. Presentational only -- every value
 * comes in as a prop and every change goes out as a callback, because the page
 * keeps all of it in the URL.
 *
 * Counts are faceted (see `facetCounts`): an option's number is what ticking it
 * would add, so a zero means "nothing more here", and that option is dimmed
 * rather than hidden so the list does not jump about.
 *
 * The price thumbs move a local copy while dragging and only emit on release,
 * so a drag is one URL change rather than one per pixel.
 */
export function ShopFilters({
  categories,
  sizes,
  colors,
  counts,
  selectedCategories,
  selectedSizes,
  selectedColors,
  lo,
  hi,
  min,
  max,
  onFacetToggle,
  onPrice,
  onResetAll,
}: ShopFiltersProps) {
  const [allColors, setAllColors] = useState(false);

  // The thumbs follow the applied bounds whenever they change from outside
  // (Reset, Back, a pasted URL); an open bound sits at the end of the track.
  // Adjusted during render rather than in an effect, so the frame that shows new bounds never
  // paints the thumbs at the old ones.
  const [draftMin, setDraftMin] = useState(min === null ? lo : min);
  const [draftMax, setDraftMax] = useState(max === null ? hi : max);
  const [applied, setApplied] = useState({ min, max, lo, hi });
  if (applied.min !== min || applied.max !== max || applied.lo !== lo || applied.hi !== hi) {
    setApplied({ min, max, lo, hi });
    setDraftMin(min === null ? lo : min);
    setDraftMax(max === null ? hi : max);
  }

  const shownColors = (() => {
    if (allColors || colors.length <= COLOR_LIMIT) return colors;
    return colors.filter((c, i) => i < COLOR_LIMIT || selectedColors.includes(c.name));
  })();

  const active =
    selectedCategories.length > 0 ||
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    min !== null ||
    max !== null;

  const count = (facet: Facet, key: string): number => {
    const n = counts[facet].get(key);
    return n === undefined ? 0 : n;
  };

  const rowClass = (n: number): string =>
    cn('flex cursor-pointer items-center gap-3 text-sm text-(--color-rail-fg)', n === 0 && 'opacity-45');

  const pct = (v: number): number => {
    const span = hi - lo;
    return span > 0 ? ((v - lo) / span) * 100 : 0;
  };

  const money = (v: number): string => formatMoney(v, { compact: true });

  const dragMin = (v: number): void => setDraftMin(Math.min(v, draftMax));
  const dragMax = (v: number): void => setDraftMax(Math.max(v, draftMin));

  /** A thumb at the end of the track means "no bound" on that side, not a bound at the end. */
  const commitPrice = (): void => {
    onPrice?.({
      min: draftMin <= lo ? null : draftMin,
      max: draftMax >= hi ? null : draftMax,
    });
  };

  // `change` (the release of a thumb, or one keyboard step) is not React's `onChange` -- React
  // maps that to the native `input` event, which fires per pixel of a drag. Committing there
  // would put one URL change per pixel back, so the commit listens for the native `change`.
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const commitRef = useRef(commitPrice);
  useEffect(() => {
    commitRef.current = commitPrice;
  });
  const priceShown = hi > lo;
  useEffect(() => {
    const els = [minRef.current, maxRef.current];
    const onChange = (): void => commitRef.current();
    for (const el of els) el?.addEventListener('change', onChange);
    return () => {
      for (const el of els) el?.removeEventListener('change', onChange);
    };
  }, [priceShown]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-(--color-rail-fg)">
          Filters
        </h2>
        {active && (
          <button
            type="button"
            className="text-xs text-(--color-rail-muted) underline underline-offset-2 outline-none hover:text-(--color-rail-fg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
            onClick={() => onResetAll?.()}
          >
            Reset all
          </button>
        )}
      </div>

      <fieldset className="mt-5 border-t border-(--color-rail-border) pt-5">
        <legend className="sr-only">Category</legend>
        <p className="mb-3 text-sm font-semibold text-(--color-rail-fg)" aria-hidden="true">
          Category
        </p>
        <ul className="flex flex-col gap-2.5">
          {categories.map((c) => (
            <li key={c.slug}>
              <label className={rowClass(count('categories', c.slug))}>
                <span className="relative inline-grid place-items-center">
                  <input
                    type="checkbox"
                    className={BOX}
                    checked={selectedCategories.includes(c.slug)}
                    onChange={() => onFacetToggle?.({ facet: 'categories', value: c.slug })}
                  />
                  <Tick />
                </span>
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-(--color-rail-muted)">
                  {count('categories', c.slug)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="mt-5 border-t border-(--color-rail-border) pt-5">
        <legend className="sr-only">Size</legend>
        <p className="mb-3 text-sm font-semibold text-(--color-rail-fg)" aria-hidden="true">
          Size
        </p>
        <ul className="flex flex-col gap-2.5">
          {sizes.map((s) => (
            <li key={s}>
              <label className={rowClass(count('sizes', s))}>
                <span className="relative inline-grid place-items-center">
                  <input
                    type="checkbox"
                    className={BOX}
                    checked={selectedSizes.includes(s)}
                    onChange={() => onFacetToggle?.({ facet: 'sizes', value: s })}
                  />
                  <Tick />
                </span>
                <span className="flex-1">{s}</span>
                <span className="text-xs text-(--color-rail-muted)">{count('sizes', s)}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="mt-5 border-t border-(--color-rail-border) pt-5">
        <legend className="sr-only">Colour</legend>
        <p className="mb-3 text-sm font-semibold text-(--color-rail-fg)" aria-hidden="true">
          Colour
        </p>
        <ul className="flex flex-col gap-2.5">
          {shownColors.map((c) => (
            <li key={c.name}>
              <label className={rowClass(count('colors', c.name))}>
                <input
                  type="checkbox"
                  className="size-4 shrink-0 cursor-pointer appearance-none rounded-full outline-none ring-1 ring-black/15 ring-offset-2 ring-offset-(--color-rail-bg) transition-shadow checked:ring-2 checked:ring-(--color-rail-fg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
                  style={{ background: c.swatch }}
                  checked={selectedColors.includes(c.name)}
                  onChange={() => onFacetToggle?.({ facet: 'colors', value: c.name })}
                />
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-(--color-rail-muted)">{count('colors', c.name)}</span>
              </label>
            </li>
          ))}
        </ul>
        {colors.length > COLOR_LIMIT && (
          <button
            type="button"
            className="mt-3 text-xs text-(--color-rail-muted) underline underline-offset-2 outline-none hover:text-(--color-rail-fg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
            aria-expanded={allColors}
            onClick={() => setAllColors(!allColors)}
          >
            {allColors ? 'Show fewer' : 'Show all ' + colors.length}
          </button>
        )}
      </fieldset>

      {priceShown && (
        <fieldset className="mt-5 border-t border-(--color-rail-border) pt-5">
          <legend className="mb-4 text-sm font-semibold text-(--color-rail-fg)">Price</legend>
          <div className="relative h-5">
            <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-(--color-rail-border)"></div>
            <div
              className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded bg-(--color-rail-fg)"
              style={{ left: `${pct(draftMin)}%`, right: `${100 - pct(draftMax)}%` }}
            ></div>
            <label className="sr-only" htmlFor="price-min">
              Minimum price
            </label>
            <input
              ref={minRef}
              id="price-min"
              type="range"
              className={THUMB}
              min={lo}
              max={hi}
              step={STEP}
              value={draftMin}
              onChange={(event) => dragMin(event.currentTarget.valueAsNumber)}
            />
            <label className="sr-only" htmlFor="price-max">
              Maximum price
            </label>
            <input
              ref={maxRef}
              id="price-max"
              type="range"
              className={THUMB}
              min={lo}
              max={hi}
              step={STEP}
              value={draftMax}
              onChange={(event) => dragMax(event.currentTarget.valueAsNumber)}
            />
          </div>
          <div className="mt-3 flex justify-between text-xs text-(--color-rail-fg)">
            <span>{money(draftMin)}</span>
            <span>{money(draftMax)}</span>
          </div>
        </fieldset>
      )}
    </>
  );
}
