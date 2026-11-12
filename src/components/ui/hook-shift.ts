/**
 * How far to shift a side-on garment photo, as a percentage of its width, so
 * its hanger hook lines up with the front photo's, which hangs from the
 * canvas's centre line. null when no hook can be found.
 *
 * Side shots hang wherever the photographer's hanger did -- about 2.5% of the
 * width off-centre on the bundled set -- so swapping front for side mid-turn
 * makes the hook jump sideways. The hook is the only opaque thing in the top
 * few rows of a cut-out, so the mean column of their opaque pixels is its
 * position. Reads pixels: the photo must be loaded and same-origin, as the
 * self-hosted rail photos are. Used by the garment viewer and the shop card.
 *
 * A plain function, not a hook: call it from an `<img onLoad>` handler with
 * `event.currentTarget`. Browser-only (it creates a canvas), so never during render.
 */
export function hookShiftPercent(img: HTMLImageElement): number | null {
  const w = 100;
  const h = Math.max(1, Math.round((w * img.naturalHeight) / Math.max(1, img.naturalWidth)));
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.canvas.width = w;
  ctx.canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  const rows = Math.max(1, Math.round(h * 0.04));
  const columns: number[] = [];
  ctx.getImageData(0, 0, w, rows).data.forEach((alpha, i) => {
    if (i % 4 === 3 && alpha > 128) columns.push(((i - 3) / 4) % w);
  });
  if (columns.length === 0) return null;
  const mean = columns.reduce((a, b) => a + b) / columns.length;
  return (0.5 - (mean + 0.5) / w) * 100;
}
