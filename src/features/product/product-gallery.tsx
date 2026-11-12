'use client';

/* eslint-disable @next/next/no-img-element -- the client's own photographs, in mixed sizes, shown as supplied */

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/shared/icons/icon';
import { assetUrl } from '@/core/utils/asset-url';

interface Shot {
  readonly src: string;
  readonly alt: string;
}

export interface ProductGalleryProps {
  readonly name: string;
  /** The product's uncut photographs, in display order. Empty = no strip. */
  readonly photos: readonly string[];
  /** A size guide picture. null = no size guide section. */
  readonly sizeChart: string | null;
}

/**
 * Under the product page's viewer: the size guide, when the listing has one, and the rest of the
 * listing's photographs -- the garment on a shelf, in the hand, close up on a strap or a hook. The
 * viewer shows one cut-out garment turning; these are the pictures a shopper scrolls for before
 * buying. A section with nothing to show renders nothing, so no empty "Photos" heading.
 *
 * Every picture opens in a native `<dialog>` lightbox: `showModal()` traps focus, closes on Escape
 * and hands focus back to the thumbnail that opened it, none of which a hand-rolled overlay does
 * without a library. The size guide opens alone; the photos open as a set, left/right to step.
 */
export function ProductGallery({ name, photos, sizeChart }: ProductGalleryProps) {
  const [open, setOpen] = useState<{
    readonly shots: readonly Shot[];
    readonly index: number;
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const shots: readonly Shot[] = photos.map((src, i) => ({
    src,
    alt: `${name}, photo ${i + 1} of ${photos.length}`,
  }));
  const chart: Shot | null = sizeChart ? { src: sizeChart, alt: `${name}, size guide` } : null;

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const step = (by: number): void =>
    setOpen((o) => (o ? { ...o, index: (o.index + by + o.shots.length) % o.shots.length } : o));

  if (photos.length === 0 && !chart) return null;

  const current = open ? open.shots[open.index] : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 lg:px-20">
      {chart && (
        <section
          id="size-guide"
          aria-labelledby="size-guide-title"
          className="border-t border-(--color-rail-fg)/10 pt-10"
        >
          <h2 id="size-guide-title" className="font-display text-2xl font-semibold">
            Size guide
          </h2>
          <button
            type="button"
            className="mt-5 block w-full max-w-sm overflow-hidden rounded-2xl bg-(--color-shop-tile) outline-none ring-1 ring-(--color-rail-fg)/10 focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
            onClick={() => setOpen({ shots: [chart], index: 0 })}
            aria-label="Enlarge the size guide"
          >
            <img
              src={assetUrl(chart.src)}
              alt={chart.alt}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full object-cover"
            />
          </button>
        </section>
      )}

      {photos.length > 0 && (
        <section
          aria-labelledby="photos-title"
          className="mt-10 border-t border-(--color-rail-fg)/10 pt-10"
        >
          <h2 id="photos-title" className="font-display text-2xl font-semibold">
            Photos
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shots.map((shot, i) => (
              <li key={shot.src}>
                <button
                  type="button"
                  className="group block w-full overflow-hidden rounded-2xl bg-(--color-shop-tile) outline-none focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
                  onClick={() => setOpen({ shots, index: i })}
                  aria-label={`Enlarge photo ${i + 1} of ${shots.length}`}
                >
                  <img
                    src={assetUrl(shot.src)}
                    alt={shot.alt}
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <dialog
        ref={dialog}
        aria-label={current?.alt ?? 'Photo'}
        className="m-0 hidden h-dvh max-h-none w-dvw max-w-none items-center justify-center bg-transparent p-0 backdrop:bg-black/80 open:flex"
        onClose={() => setOpen(null)}
        onClick={(e) => {
          // A click on the dialog itself is a click outside the picture: it fills the viewport.
          if (e.target === e.currentTarget) setOpen(null);
        }}
        onKeyDown={(e) => {
          if (!open || open.shots.length < 2) return;
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
        }}
      >
        {current && (
          <>
            <img
              src={assetUrl(current.src)}
              alt={current.alt}
              className="max-h-[88dvh] max-w-[92dvw] rounded-xl object-contain"
            />
            <button
              type="button"
              className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/90 text-black outline-none focus-visible:ring-2 focus-visible:ring-white"
              onClick={() => setOpen(null)}
              aria-label="Close"
            >
              <Icon name="close" size={20} />
            </button>
            {open && open.shots.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black outline-none focus-visible:ring-2 focus-visible:ring-white"
                  onClick={() => step(-1)}
                  aria-label="Previous photo"
                >
                  <Icon name="chevron_left" size={24} />
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black outline-none focus-visible:ring-2 focus-visible:ring-white"
                  onClick={() => step(1)}
                  aria-label="Next photo"
                >
                  <Icon name="chevron_right" size={24} />
                </button>
                <p
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
                  aria-live="polite"
                >
                  {open.index + 1} / {open.shots.length}
                </p>
              </>
            )}
          </>
        )}
      </dialog>
    </div>
  );
}
