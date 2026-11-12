'use client';

/* The photos are the client's own, at their own proportions, laid out by CSS; next/image would
   resize and re-encode them for no gain. */
/* eslint-disable @next/next/no-img-element */

import type { Product } from '@/core/data/catalog.model';
import { assetUrl } from '@/core/utils/asset-url';
import { cn } from '@/core/utils/cn';
import { FramedPhoto } from './framed-photo';

export interface ProductMediaProps {
  readonly product: Product;
  /** The cut-out repainted to the chosen colourway, or the original while that is not ready. */
  readonly cutout: string | null;
  /** The cleared photographs to show after the cut-out (`AD_PHOTOS`). */
  readonly photos: readonly string[];
  readonly slide: number;
  readonly onSlide: (index: number) => void;
}

/** One picture the stage can show: the repainted cut-out, or a photograph. */
type Slide =
  | { readonly kind: 'cutout'; readonly base: string; readonly shown: string }
  | { readonly kind: 'photo'; readonly src: string };

const PANEL = 'bg-linear-to-b from-white to-(--color-hero-to)';

/**
 * The product's pictures: a big square stage and, when there is more than one picture, a strip of
 * thumbnails under it.
 *
 * The first picture is the cut-out, painted to the colour chosen in the picker, so choosing a
 * colour visibly changes something on the page (the parent sends the stage back to it when the
 * colour changes). The rest are real photographs, but only the ones cleared for an ad
 * (`product-landing.config.ts` says why it is not the whole gallery).
 *
 * The thumbnails are buttons, 64px, marked `aria-current` for the one on show.
 */
export function ProductMedia({ product, cutout, photos, slide, onSlide }: ProductMediaProps) {
  const slides: Slide[] = [];
  if (product.image && cutout) slides.push({ kind: 'cutout', base: product.image, shown: cutout });
  for (const src of photos) slides.push({ kind: 'photo', src });

  const current = slides[Math.min(slide, slides.length - 1)];

  return (
    <div>
      <div
        className={cn(
          'relative aspect-square overflow-hidden rounded-3xl shadow-sm ring-1 ring-black/5',
          current?.kind === 'photo' ? 'bg-white' : PANEL,
        )}
      >
        {current?.kind === 'cutout' && (
          <div className="absolute inset-0 drop-shadow-xl">
            <FramedPhoto
              base={current.base}
              shown={current.shown}
              alt={`${product.name}`}
              frameRatio={1}
              pad={0.07}
            />
          </div>
        )}
        {current?.kind === 'photo' && (
          <img
            src={assetUrl(current.src)}
            alt={`${product.name}, photo`}
            className="absolute inset-0 size-full object-cover"
            draggable={false}
          />
        )}
        {!current && (
          <div className="flex size-full items-center justify-center text-sm text-(--color-rail-muted)">
            No image
          </div>
        )}
      </div>

      {slides.length > 1 && (
        <ul className="mt-3 flex gap-2" aria-label="Photos">
          {slides.map((item, i) => {
            const on = i === Math.min(slide, slides.length - 1);
            return (
              <li key={item.kind === 'cutout' ? 'cutout' : item.src}>
                <button
                  type="button"
                  onClick={() => onSlide(i)}
                  aria-label={`Show photo ${i + 1} of ${slides.length}`}
                  aria-current={on ? 'true' : undefined}
                  className={cn(
                    'relative block size-16 overflow-hidden rounded-xl outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-(--color-rail-fg)',
                    item.kind === 'cutout' ? PANEL : 'bg-white',
                    on
                      ? 'ring-2 ring-(--color-lp-accent)'
                      : 'ring-1 ring-black/10 hover:ring-black/30',
                  )}
                >
                  {item.kind === 'cutout' ? (
                    <FramedPhoto
                      base={item.base}
                      shown={item.shown}
                      alt=""
                      frameRatio={1}
                      pad={0.05}
                    />
                  ) : (
                    <img
                      src={assetUrl(item.src)}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                      draggable={false}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
