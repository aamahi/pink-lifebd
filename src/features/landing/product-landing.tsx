'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { prewarm, useRecolored } from '@/components/ui/garment-recolor';
import { Skeleton } from '@/components/ui/skeleton';
import { getProduct, isProductNotFound } from '@/core/data/catalog.api';
import type { Product } from '@/core/data/catalog.model';
import { quickAddBlock } from '@/core/data/variant';
import { useAsync } from '@/core/hooks/use-async';
import { adPhotosFor } from './product-landing.config';
import { LandingBar } from './sections/landing-bar';
import { OrderPanel } from './sections/order-panel';
import { ProductMedia } from './sections/product-media';
import { SizeGuide } from './sections/size-guide';

export interface ProductLandingProps {
  /** The `[slug]` route parameter: which product this ad page sells. */
  readonly slug: string;
}

/**
 * The ad page for ONE product (`/lp/[slug]`): the page a Facebook or Instagram ad points at, built
 * to turn a click into an order. The photos and the whole order form sit side by side (stacked on
 * a phone): colour, size, quantity, name, number, address, delivery area and one confirm button,
 * with no separate checkout to lose the visitor at. Below that, only the size guide, and only when
 * the product has one: the page ends where the order does.
 *
 * It is the same page for every product in the catalogue; only the slug changes. It reads the one
 * product (`getProduct`) and gives each of the four states its own branch: loading (a ghost of the
 * layout), failed (with retry), not found (its own screen: a mistyped link is not a server fault),
 * and loaded. Like the category pages it drops the storefront's header, footer and tab bar for its
 * own slim bar (`layoutFlagsFor` in `main-layout.tsx`).
 */
export function ProductLanding({ slug }: ProductLandingProps) {
  const request = useAsync(() => getProduct(slug), [slug]);
  // The phone's confirm bar is pinned over the foot of the page, so leave room under the footer.
  const barShown = request.status === 'ready' && quickAddBlock(request.data) === null;

  return (
    <div className="bg-(--color-hero-from)">
      <LandingBar />

      {request.status === 'loading' && <Loading />}

      {request.status === 'error' &&
        (isProductNotFound(request.error) ? (
          <NotFound slug={slug} />
        ) : (
          <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
            <ErrorState
              title="We could not load this style"
              message="Please check your connection and try again."
              onRetry={request.reload}
            />
          </div>
        ))}

      {request.status === 'ready' && <Loaded product={request.data} />}

      {/* The phone's confirm bar is pinned over the foot of the page; keep the last content clear. */}
      {barShown && <div aria-hidden="true" className="h-24 md:hidden"></div>}
    </div>
  );
}

function Loading() {
  return (
    <div role="status" aria-label="Loading this style">
      <div
        className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 pt-4 sm:px-6 md:grid-cols-2 md:gap-10 md:pt-10 lg:px-8"
        aria-hidden="true"
      >
        <div className="aspect-square">
          <Skeleton shape="block" height="100%" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton height="2.5rem" />
          <Skeleton height="1.75rem" className="max-w-40" />
          <Skeleton height="4rem" />
          <Skeleton height="3rem" />
          <Skeleton height="3rem" />
        </div>
      </div>
    </div>
  );
}

function NotFound({ slug }: { readonly slug: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <h1 className="font-display text-3xl text-(--color-hero-ink)">
        We could not find that style
      </h1>
      <p className="mt-3 text-(--color-rail-muted)">
        Nothing here matches <code className="font-mono">{slug}</code>. The link may be mistyped, or
        the style may have been taken down.
      </p>
      <Button href="/shop" variant="accent" size="lg" className="mt-6">
        Browse the shop
      </Button>
    </div>
  );
}

function Loaded({ product }: { readonly product: Product }) {
  const [colorIndex, setColorIndex] = useState(0);
  const [slide, setSlide] = useState(0);

  // The cut-out repainted to the chosen colourway, the same stand-in the product page uses.
  const recolorable = useMemo(
    () =>
      product.image
        ? { image: product.image, backImage: null, sideImage: null, colors: product.colors }
        : null,
    [product],
  );
  const shown = useRecolored(recolorable, colorIndex);
  const cutout = shown?.image ?? product.image;

  const photos = useMemo(() => adPhotosFor(product.slug), [product.slug]);

  return (
    <>
      <section className="bg-linear-to-b from-(--color-hero-from) to-(--color-hero-to)">
        <div className="mx-auto grid max-w-6xl items-start gap-6 px-4 pb-10 pt-4 sm:px-6 md:grid-cols-2 md:gap-10 md:pb-16 md:pt-10 lg:gap-14 lg:px-8">
          {/* Stays in view beside the long form on a wide screen. */}
          <div className="md:sticky md:top-20">
            <ProductMedia
              product={product}
              cutout={cutout}
              photos={photos}
              slide={slide}
              onSlide={setSlide}
            />
          </div>
          <OrderPanel
            product={product}
            colorIndex={colorIndex}
            onColor={(index) => {
              setColorIndex(index);
              // The repaint shows on the cut-out, so bring the stage back to it.
              setSlide(0);
            }}
            onColorHint={(index) => prewarm(recolorable, index)}
            cutout={cutout}
          />
        </div>
      </section>

      <SizeGuide products={[product]} />
    </>
  );
}
