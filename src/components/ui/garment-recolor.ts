'use client';

import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '@/core/utils/asset-url';

/**
 * Recolour a garment photo to another colourway, in the browser.
 *
 * The catalogue photographs each garment in one colourway only (its first
 * swatch). Choosing another swatch on the product page or in the hero's open
 * view repaints the photo instead of leaving the wrong colour on screen:
 *
 * 1. **The cloth's own colour** is measured from the photo, not taken from the
 *    swatch -- the median, in CIELAB, of a lower-torso patch (x 35-65%,
 *    y 55-80%), below where chest prints sit. A swatch hex is a label's idea
 *    of the colour; the photo is what the pixels actually are.
 * 2. **Which pixels are cloth**: those close to that colour in hue and
 *    chroma (the a/b plane, tolerance widening with the cloth's own chroma,
 *    since saturated fabric shifts more in its folds) and within a lightness
 *    band around it (32 below for folds, 18 above for highlights), with soft
 *    edges so the boundary does not alias. That leaves out a white print on
 *    a black tee or a black print on a grey hoodie (far off in lightness),
 *    anything above the hanger's top -- the metal hook, which on a black
 *    garment is otherwise as dark as the cloth -- and, near the top, the
 *    hanger's wood, whose colour is measured from the hanger itself because
 *    an ochre or brick tee is close enough to wood to pass the hue test.
 * 3. **The repaint** keeps the fold shading: lightness scales toward the
 *    target from whichever end it moves away from (multiplicative toward
 *    black, toward white from the top), plus a quarter of the original's
 *    offset from the cloth's median so folds stay visible on a dark target;
 *    a/b move to the target's with half of the original variation kept.
 *    Going dark to light or back (a lightness jump over 50), a print is
 *    turned round with the cloth, so a white print on black becomes a dark
 *    one on bone instead of vanishing into it.
 *
 * It is a demo stand-in for real colourway photography, and says so: a
 * striped piece has only one stripe colour repainted. Results are cached
 * per photo and colour, as object URLs that live as long as the page.
 */

interface Lab {
  L: number;
  a: number;
  b: number;
}

/** sRGB 0-255 to linear light, precomputed. */
const LINEAR = Float32Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

const D65 = { x: 0.95047, y: 1, z: 1.08883 };
const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const finv = (t: number) => (t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787);
const gamma = (c: number) => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
};

function toLab(r: number, g: number, b: number): Lab {
  const R = LINEAR[r] as number;
  const G = LINEAR[g] as number;
  const B = LINEAR[b] as number;
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / D65.x);
  const y = f((R * 0.2126 + G * 0.7152 + B * 0.0722) / D65.y);
  const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / D65.z);
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

function fromLab({ L, a, b }: Lab): [number, number, number] {
  const fy = (L + 16) / 116;
  const X = finv(fy + a / 500) * D65.x;
  const Y = finv(fy) * D65.y;
  const Z = finv(fy - b / 200) * D65.z;
  return [
    gamma(X * 3.2406 + Y * -1.5372 + Z * -0.4986),
    gamma(X * -0.9689 + Y * 1.8758 + Z * 0.0415),
    gamma(X * 0.0557 + Y * -0.204 + Z * 1.057),
  ];
}

function hexToLab(hex: string): Lab | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1] as string, 16);
  return toLab((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const median = (v: number[]) => {
  const s = [...v].sort((p, q) => p - q);
  return s[Math.floor(s.length / 2)] as number;
};

const cache = new Map<string, Promise<string | null>>();

/**
 * `src` repainted to `swatch` (a #rrggbb colour), as an object URL; null when
 * it cannot be done (no canvas, an unreadable swatch, no cloth found), in
 * which case the caller keeps the original photo.
 */
export function recolorPhoto(src: string, swatch: string): Promise<string | null> {
  const key = `${src}|${swatch}`;
  let job = cache.get(key);
  if (!job) {
    job = paint(src, swatch).catch(() => null);
    cache.set(key, job);
  }
  return job;
}

async function paint(src: string, swatch: string): Promise<string | null> {
  const target = hexToLab(swatch);
  if (!target || typeof document === 'undefined') return null;
  const img = new Image();
  // `src` is the data string (`images/...`, no leading slash); a bare path would resolve against
  // the current route here, since Next has no <base href>. The cache key stays the original string.
  img.src = assetUrl(src);
  await img.decode();
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const frame = ctx.getImageData(0, 0, w, h);
  const px = frame.data;

  // 1. The cloth's colour: median Lab of the lower-torso patch.
  const Ls: number[] = [];
  const As: number[] = [];
  const Bs: number[] = [];
  for (let y = Math.floor(h * 0.55); y < h * 0.8; y += 3) {
    for (let x = Math.floor(w * 0.35); x < w * 0.65; x += 3) {
      const i = (y * w + x) * 4;
      if ((px[i + 3] as number) < 250) continue;
      const lab = toLab(px[i] as number, px[i + 1] as number, px[i + 2] as number);
      Ls.push(lab.L);
      As.push(lab.a);
      Bs.push(lab.b);
    }
  }
  if (Ls.length < 50) return null;
  const base: Lab = { L: median(Ls), a: median(As), b: median(Bs) };
  const chroma = Math.hypot(base.a, base.b);
  const tol = 10 + 0.25 * chroma;

  // 2a. The hanger's top: the first row with a run of warm, saturated
  // (wood) pixels. The hook above it is never cloth.
  let hangerTop = 0;
  rows: for (let y = 0; y < h * 0.45; y++) {
    let wood = 0;
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4;
      if ((px[i + 3] as number) < 200) continue;
      const lab = toLab(px[i] as number, px[i + 1] as number, px[i + 2] as number);
      if (lab.b > 15 && Math.hypot(lab.a, lab.b) > 18 && lab.L > 35 && lab.L < 85) {
        wood++;
        if (wood >= 3) {
          hangerTop = y;
          break rows;
        }
      }
    }
  }

  // 2b. The hanger's own wood colour, from the rows just under its top --
  // the arc where the hook joins, which no garment reaches. Measured rather
  // than assumed, because an ochre or brick tee is close enough to wood that
  // the hue test alone repainted the hanger with the shirt.
  const woodL: number[] = [];
  const woodA: number[] = [];
  const woodB: number[] = [];
  for (let y = hangerTop; y < hangerTop + h * 0.03; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if ((px[i + 3] as number) < 250) continue;
      const lab = toLab(px[i] as number, px[i + 1] as number, px[i + 2] as number);
      if (lab.b > 12 && Math.hypot(lab.a, lab.b) > 15) {
        woodL.push(lab.L);
        woodA.push(lab.a);
        woodB.push(lab.b);
      }
    }
  }
  const wood: Lab | null =
    woodL.length > 20 ? { L: median(woodL), a: median(woodA), b: median(woodB) } : null;
  /** Below this row the hanger has ended; only above it can a pixel be wood. */
  const hangerEnd = hangerTop + h * 0.2;

  // How far below the cloth's median a fold may fall. Neutral cloth: 42-50,
  // which takes in a heather fleece's dark flecks in its side shadows (at 32
  // they stayed grey on a hoodie turned bone, as streaks) while a black print
  // on it, about 50 below, stays out. Saturated cloth reads darker and duller
  // still in its folds and under the arms, so its band reaches further; a
  // print on it is told apart by hue instead.
  const below = chroma > 20 ? [48, 58] : [42, 50];
  // Dark cloth to light or back: a print that contrasted with the old colour
  // would vanish into the new one (a white print on a tee turned bone), so
  // prints are turned the other way round with it.
  const invertPrints = Math.abs(target.L - base.L) > 50;

  // 3. Repaint every pixel that reads as cloth, by how much it does.
  let touched = 0;
  for (let y = hangerTop; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if ((px[i + 3] as number) === 0) continue;
      const p = toLab(px[i] as number, px[i + 1] as number, px[i + 2] as number);
      const dL = p.L - base.L;
      const hue = 1 - smooth(tol, tol * 1.6, Math.hypot(p.a - base.a, p.b - base.b));
      const notWood =
        wood && y < hangerEnd
          ? smooth(9, 15, Math.hypot(p.L - wood.L, p.a - wood.a, p.b - wood.b))
          : 1;
      const lower = 1 - smooth(below[0] as number, below[1] as number, -dL);
      const upper = 1 - smooth(18, 26, Math.max(0, dL));
      const cloth = hue * notWood * lower * upper;
      // The print: near the cloth in hue, well off it in lightness.
      const print = invertPrints ? hue * notWood * (1 - lower * upper) : 0;
      const weight = Math.min(1, cloth + print);
      if (weight <= 0.01) continue;
      touched++;
      let L: number;
      if (cloth >= print) {
        const scaled =
          target.L <= base.L
            ? target.L * (p.L / Math.max(1, base.L))
            : 100 - (100 - target.L) * ((100 - p.L) / Math.max(1, 100 - base.L));
        L = scaled + 0.25 * dL;
      } else {
        L = target.L - dL * 0.9;
      }
      const [r, g, b] = fromLab({
        L: Math.max(0, Math.min(100, L)),
        a: target.a + (p.a - base.a) * 0.5,
        b: target.b + (p.b - base.b) * 0.5,
      });
      px[i] = (px[i] as number) + (r - (px[i] as number)) * weight;
      px[i + 1] = (px[i + 1] as number) + (g - (px[i + 1] as number)) * weight;
      px[i + 2] = (px[i + 2] as number) + (b - (px[i + 2] as number)) * weight;
    }
  }
  if (touched === 0) return null;
  ctx.putImageData(frame, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.9),
  );
  return blob ? URL.createObjectURL(blob) : null;
}

/**
 * Start repainting a colourway before it is chosen -- on hovering or focusing
 * its swatch -- so the click usually lands on a finished photo. About 150ms
 * of work per photo on a mid-range laptop.
 */
export function prewarm(item: Recolorable | null, index: number): void {
  const swatch = item?.colors[index]?.swatch;
  if (!item || index <= 0 || !swatch) return;
  for (const src of [item.image, item.backImage, item.sideImage]) {
    if (src) void recolorPhoto(src, swatch);
  }
}

/** The fields a recolourable garment needs: its three photos and its colourways. */
export interface Recolorable {
  readonly image: string;
  readonly backImage: string | null;
  readonly sideImage: string | null;
  readonly colors: readonly { readonly swatch: string }[];
}

const keyOf = (item: Recolorable, index: number) => `${item.image}|${index}`;

/**
 * `source` with its photos repainted to colourway `colorIndex`. Index 0 is
 * the photographed colourway and passes through untouched. Until the repaint
 * is ready -- and for good if it fails -- the original photos show, so a
 * choice never blanks the garment. Replaces the Angular `recolored(source, colorIndex)`
 * (which took signal getters); here both are plain values from the caller's render.
 *
 * The effect keys on primitives (the front photo, the colourway, its swatch), not on `source`'s
 * identity, so a caller that builds a fresh `{ ...item }` every render does not restart the
 * repaint each time; and the result is only applied if the latest `source`/`colorIndex` (read
 * through a ref when the repaint lands) still name the same colourway -- a later choice may have
 * landed meanwhile.
 */
export function useRecolored<T extends Recolorable>(
  source: T | null,
  colorIndex: number,
): T | null {
  const [ready, setReady] = useState<{ key: string; value: T } | null>(null);
  const latest = useRef({ source, colorIndex });
  useEffect(() => {
    latest.current = { source, colorIndex };
  });

  const image = source?.image ?? null;
  const back = source?.backImage ?? null;
  const side = source?.sideImage ?? null;
  const swatch = source?.colors[colorIndex]?.swatch ?? null;
  const readyKey = ready?.key ?? null;

  useEffect(() => {
    if (image === null || colorIndex <= 0 || !swatch) return;
    const key = `${image}|${colorIndex}`;
    if (readyKey === key) return;
    void Promise.all([
      recolorPhoto(image, swatch),
      back ? recolorPhoto(back, swatch) : Promise.resolve(null),
      side ? recolorPhoto(side, swatch) : Promise.resolve(null),
    ]).then(([front, backNew, sideNew]) => {
      const now = latest.current;
      // A later choice may have landed meanwhile; only the current one is applied.
      if (!front || !now.source || keyOf(now.source, now.colorIndex) !== key) return;
      setReady({
        key,
        value: {
          ...now.source,
          image: front,
          backImage: backNew ?? back,
          sideImage: sideNew ?? side,
        },
      });
    });
  }, [image, back, side, swatch, colorIndex, readyKey]);

  if (!source) return null;
  return ready && ready.key === keyOf(source, colorIndex) ? ready.value : source;
}
