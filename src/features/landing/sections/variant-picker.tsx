'use client';

import { useId } from 'react';
import type { Product } from '@/core/data/catalog.model';
import { cn } from '@/core/utils/cn';

export interface VariantPickerProps {
  readonly product: Product;
  readonly colorIndex: number;
  readonly onColor: (index: number) => void;
  /** null = no size chosen yet. */
  readonly size: string | null;
  readonly onSize: (size: string) => void;
  /** The visitor tried to order without a size: ring the sizes and say so. */
  readonly needSize: boolean;
  /** Prewarms the repaint for a colour before it is clicked. */
  readonly onColorHint?: (index: number) => void;
}

/**
 * Colour swatches and size chips for one product, as two native radio groups: arrow keys, one tab
 * stop each and form semantics come with the element, and the whole chip is its label so the
 * target is large enough for a thumb.
 *
 * No size is preselected. A bra in the wrong cup is a return, and a silent default is a size the
 * visitor never chose; the buttons on the tile ask for one instead of guessing (`needSize`).
 * A product with no sizes to choose (`sizes` empty) renders no size group at all.
 */
export function VariantPicker({
  product,
  colorIndex,
  onColor,
  size,
  onSize,
  needSize,
  onColorHint,
}: VariantPickerProps) {
  const uid = useId();
  const color = product.colors[colorIndex];

  return (
    <div className="flex flex-col gap-3">
      {product.colors.length > 0 && (
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-1.5 text-xs text-(--color-rail-muted)">
            Colour: <span className="font-medium text-(--color-rail-fg)">{color?.name}</span>
          </legend>
          {/* The label carries 4px of padding the swatch does not draw, so the touch target is
              36px while the swatch stays 28px. */}
          <div className="-m-1 flex flex-wrap">
            {product.colors.map((c, i) => (
              <label
                key={c.name}
                className="relative cursor-pointer p-1"
                onPointerEnter={() => onColorHint?.(i)}
              >
                <input
                  type="radio"
                  name={`${uid}-color`}
                  className="peer sr-only"
                  checked={i === colorIndex}
                  onChange={() => onColor(i)}
                  aria-label={c.name}
                />
                <span
                  className="block size-7 rounded-full ring-1 ring-black/15 ring-offset-2 ring-offset-white transition-shadow peer-checked:ring-2 peer-checked:ring-(--color-lp-accent) peer-focus-visible:ring-2 peer-focus-visible:ring-(--color-rail-fg)"
                  style={{ background: c.swatch }}
                  title={c.name}
                ></span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {product.sizes.length > 0 && (
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-1.5 text-xs text-(--color-rail-muted)">Size</legend>
          <div className="flex flex-wrap gap-1.5">
            {product.sizes.map((s) => (
              <label key={s} className="cursor-pointer">
                <input
                  type="radio"
                  name={`${uid}-size`}
                  className="peer sr-only"
                  checked={s === size}
                  onChange={() => onSize(s)}
                />
                <span
                  className={cn(
                    'flex h-11 min-w-11 items-center justify-center rounded-lg px-2.5 text-sm ring-1 ring-inset transition-colors',
                    'peer-checked:bg-(--color-hero-ink) peer-checked:text-white peer-checked:ring-(--color-hero-ink)',
                    'peer-focus-visible:ring-2 peer-focus-visible:ring-(--color-rail-fg)',
                    needSize && size === null
                      ? 'ring-(--color-lp-accent-dark)'
                      : 'ring-(--color-rail-border)',
                  )}
                >
                  {s}
                </span>
              </label>
            ))}
          </div>
          <p
            role="alert"
            className="mt-1.5 min-h-4 text-xs font-medium text-(--color-lp-accent-dark)"
          >
            {needSize && size === null ? 'Choose a size first' : ''}
          </p>
        </fieldset>
      )}
    </div>
  );
}
