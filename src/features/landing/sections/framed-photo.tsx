'use client';

/* The photo is placed by arithmetic from its measured content box (left, width, top as percentages),
   which next/image's wrapper and fixed width/height would fight. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { assetUrl } from '@/core/utils/asset-url';

/** The visible part of a cut-out, as fractions of its canvas, and the canvas's own proportions. */
interface ContentBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  /** Canvas width over height. */
  readonly aspect: number;
}

/** Width the photo is drawn at for measuring; the height follows its proportions. */
const SAMPLE_WIDTH = 96;
/** Alpha above this counts as garment. Stray soft pixels from the cut-out are below it. */
const ALPHA_FLOOR = 40;

/** One measurement per photo for the life of the page. `null` = could not be measured. */
const measured = new Map<string, Promise<ContentBox | null>>();

function measure(src: string): Promise<ContentBox | null> {
  const known = measured.get(src);
  if (known) return known;
  const result = new Promise<ContentBox | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = SAMPLE_WIDTH;
        const h = Math.max(1, Math.round((w * img.naturalHeight) / img.naturalWidth));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        let l = w;
        let t = h;
        let r = -1;
        let b = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if ((data[(y * w + x) * 4 + 3] ?? 0) > ALPHA_FLOOR) {
              if (x < l) l = x;
              if (x > r) r = x;
              if (y < t) t = y;
              if (y > b) b = y;
            }
          }
        }
        if (r < l || b < t) return resolve(null);
        resolve({
          left: l / w,
          top: t / h,
          right: (r + 1) / w,
          bottom: (b + 1) / h,
          aspect: img.naturalWidth / img.naturalHeight,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = assetUrl(src);
  });
  measured.set(src, result);
  return result;
}

export interface FramedPhotoProps {
  /** The photographed cut-out, which is what gets measured. */
  readonly base: string;
  /** What is drawn: `base` itself, or a repaint of it to another colourway (same canvas, same box). */
  readonly shown: string;
  readonly alt: string;
  /** Height of the frame over its width. */
  readonly frameRatio: number;
  /** Space kept clear on every side, as a fraction of the frame's width. */
  readonly pad?: number;
}

/**
 * A garment cut-out framed to fill its tile: measured once for where the garment actually is on
 * its canvas, then scaled up and centred.
 *
 * The catalogue's cut-outs share one tall canvas, but the garment sits wherever the photographer
 * put it: against the top edge on some, mid-canvas on others. One CSS crop (`object-cover`,
 * `object-top`) frames one of those kinds and cuts the other in half, and the plain fit leaves
 * every flat-lay small over a half-empty tile. Measuring the alpha channel is the only thing that
 * frames both.
 *
 * While the measurement is pending the frame is empty (the tile's own background shows, a few
 * milliseconds for a cached file). If it fails, the photo falls back to a plain fit-to-height so a
 * tile is never blank.
 *
 * The parent must be `position: relative` and have the frame's proportions.
 */
export function FramedPhoto({ base, shown, alt, frameRatio, pad = 0.1 }: FramedPhotoProps) {
  const [result, setResult] = useState<{ src: string; box: ContentBox | null } | null>(null);
  useEffect(() => {
    let live = true;
    void measure(base).then((box) => {
      if (live) setResult({ src: base, box });
    });
    return () => {
      live = false;
    };
  }, [base]);

  const settled = result?.src === base ? result : null;
  if (!settled) return <span className="absolute inset-0" aria-hidden="true"></span>;

  const { box } = settled;
  if (!box) {
    return (
      <img
        src={assetUrl(shown)}
        alt={alt}
        draggable={false}
        className="absolute inset-0 mx-auto h-full w-auto object-contain p-3"
      />
    );
  }

  // Everything below is in units of the frame's width (so its height is `frameRatio`).
  const contentW = box.right - box.left;
  const contentH = box.bottom - box.top;
  const room = { w: 1 - 2 * pad, h: frameRatio - 2 * pad };
  const canvasW = Math.min(room.w / contentW, (room.h * box.aspect) / contentH);
  const canvasH = canvasW / box.aspect;
  const left = 0.5 - (box.left + contentW / 2) * canvasW;
  const top = frameRatio / 2 - (box.top + contentH / 2) * canvasH;

  return (
    <img
      src={assetUrl(shown)}
      alt={alt}
      draggable={false}
      className="absolute max-w-none"
      style={{
        width: `${canvasW * 100}%`,
        left: `${left * 100}%`,
        top: `${(top / frameRatio) * 100}%`,
      }}
    />
  );
}
