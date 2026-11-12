/* The charts are the client's own pictures at their own proportions, linked to the full-size file;
   next/image would size and re-encode them for no gain. */
/* eslint-disable @next/next/no-img-element */

import type { Product } from '@/core/data/catalog.model';
import { assetUrl } from '@/core/utils/asset-url';

/**
 * The size charts of the products on this page, one picture per chart, each opening full size.
 * Rendered only when at least one product has a chart: a "Size guide" heading over nothing would
 * promise a table that is not there.
 */
export function SizeGuide({ products }: { readonly products: readonly Product[] }) {
  const charts = products.filter((p): p is Product & { sizeChart: string } => p.sizeChart !== null);
  if (charts.length === 0) return null;

  return (
    <section
      id="size-guide"
      aria-labelledby="size-guide-title"
      className="scroll-mt-16 bg-white px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="size-guide-title"
          className="font-display text-3xl text-(--color-hero-ink) sm:text-4xl"
        >
          Size guide
        </h2>
        <p className="mt-2 max-w-2xl text-(--color-rail-muted)">
          Find your size on the chart for the style you like. Tap a chart to open it full size.
        </p>
        <ul className="mt-8 grid gap-6 md:grid-cols-2">
          {charts.map((p) => (
            <li key={p.id}>
              <figure>
                <a
                  href={assetUrl(p.sizeChart)}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-2xl bg-(--color-shop-tile) ring-1 ring-black/5 outline-none focus-visible:ring-2 focus-visible:ring-(--color-rail-fg)"
                >
                  <img
                    src={assetUrl(p.sizeChart)}
                    alt={`Size chart for ${p.name}`}
                    loading="lazy"
                    className="h-auto w-full"
                  />
                </a>
                <figcaption className="mt-2 text-sm font-medium text-(--color-rail-fg)">
                  {p.name}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
