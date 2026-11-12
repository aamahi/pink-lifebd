'use client';

/* eslint-disable @next/next/no-img-element -- the backdrop is decorative and blurred; its photos are plain <img> */

import { useEffect, useMemo, useRef, useState } from 'react';
import { getProduct, isProductNotFound, listProducts } from '@/core/data/catalog.api';
import type { Product as ProductModel } from '@/core/data/catalog.model';
import { useAsync } from '@/core/hooks/use-async';
import { useSeo } from '@/core/seo';
import { assetUrl } from '@/core/utils/asset-url';
import { cn } from '@/core/utils/cn';
import { BackLink } from '@/components/shared/navigation/back-link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { prewarm, useRecolored } from '@/components/ui/garment-recolor';
import { Skeleton } from '@/components/ui/skeleton';
import {
  GarmentViewer,
  type Face,
  type GarmentViewerHandle,
} from '@/features/home/sections/hero-banner/garment-viewer';
import { RailDetailPanel } from '@/features/home/sections/hero-banner/rail-detail-panel';
import type { DetailItem, RailGarment } from '@/features/home/sections/hero-banner/rail.model';
import { ProductGallery } from './product-gallery';

/** Garments in the blurred rail behind the page. */
const BACKDROP_COUNT = 8;

const FACES = ['front', 'back'] as const;

export interface ProductProps {
  /** The `[slug]` route parameter. */
  readonly slug: string;
}

/**
 * PDP archetype, at `/product/[slug]` (issue #937's routing table -- a leaf route,
 * not a group, since this shard adds no resolver or child route).
 *
 * **Layout.** The home hero's lifted-piece view, as a page: the garment hangs
 * on its wire in a `GarmentViewer` (the same rise-in, drag turntable, hover
 * tilt, float and zoom), with Front / Back under it, over a blurred rail of
 * the rest of the collection. The text side is the hero's own
 * `RailDetailPanel`, given the catalogue product, so the title, rating,
 * pickers, Add to Cart and wishlist heart behave the same in both places and
 * the cart holds the real product rather than a synthesised one. Reused from
 * the hero's folder rather than copied, so the two cannot drift apart.
 *
 * The title reads "Name · Colour" for the first colourway because that is the
 * one photographed; the pickers still offer every colourway.
 *
 * `slug` arrives from the route's server `page.tsx` (`await params`), which renders this with
 * `key={slug}` -- the Angular router reused one component instance across `/product/a` ->
 * `/product/b`, so it had to reload in an `effect()`; here a new slug is a new instance and its
 * request, colourway and Front/Back state all start clean.
 *
 * A missing product is a NOT-FOUND, rendered here with a link back, rather than a
 * redirect. A redirect loses the URL the user actually asked for, which is the one
 * piece of information anyone debugging a broken link needs.
 *
 * The page-level Back control is `<BackLink fallback="/shop">` (rule 6 of
 * `engineering-conventions.md`), not a hand-rolled `<a>` -- this page
 * has a real section to return to (the shop), unlike `not-found.tsx`.
 */
export function Product({ slug }: ProductProps) {
  const request = useAsync(() => getProduct(slug), [slug]);
  const product: ProductModel | null = request.status === 'ready' ? request.data : null;
  const loading = request.status === 'loading';

  // A 404 and a dead API are different facts and get different screens; `isProductNotFound` reads
  // which one it was off the message (there is no status left once it is the `useAsync` string).
  const failure = request.status === 'error' ? request.error : null;
  const notFound = failure !== null && isProductNotFound(failure);
  const error = failure !== null && !notFound ? failure : null;

  // A failed list request leaves the backdrop empty, which is only less pretty, so it has no states.
  const list = useAsync(() => listProducts(), []);
  const listed = list.status === 'ready' ? list.data : null;
  const backdrop = useMemo<readonly string[]>(
    () =>
      listed
        ? listed
            .map((p) => p.image)
            .filter((src): src is string => src !== null)
            .slice(0, BACKDROP_COUNT)
        : [],
    [listed],
  );

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  /** The product in the detail panel's shape; the summary is its one-line description. */
  const item = useMemo<DetailItem | null>(() => {
    if (!product) return null;
    const photographed = product.colors[0];
    return {
      id: product.id,
      name: photographed ? `${product.name} · ${photographed.name}` : product.name,
      description: product.summary,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      badge: null,
      rating: product.rating,
      reviewCount: product.reviewCount,
      image: product.image,
      backImage: product.backImage,
      sideImage: product.sideImage,
      colors: product.colors,
      sizes: product.sizes,
    };
  }, [product]);

  /** The colourway chosen in the panel; 0 is the photographed one. */
  const [colorIndex, setColorIndex] = useState(0);

  /** The viewer needs a photo; a product without one shows the "No image" tile instead. */
  const photographed = useMemo<RailGarment | null>(
    () => (item?.image ? { ...item, image: item.image } : null),
    [item],
  );
  /** The photographed garment, repainted to the chosen colourway (`components/ui/garment-recolor.ts`). */
  const garment = useRecolored(photographed, colorIndex);

  const viewerRef = useRef<GarmentViewerHandle>(null);
  /** Which face is toward the visitor, reported by the viewer as it turns. */
  const [side, setSide] = useState<Face>('front');

  useSeo(
    product
      ? {
          title: product.name,
          description: product.summary,
          path: `/product/${product.slug}`,
          type: 'product',
          image: product.image ?? undefined,
        }
      : notFound
        ? { title: 'Not found', path: `/product/${slug}`, noIndex: true }
        : null,
  );

  return (
    <section className="relative isolate overflow-hidden bg-(--color-rail-bg) text-(--color-rail-fg)">
      {/*
        Decorative: the rest of the collection hanging out of focus behind the
        piece, as the hero's open view sits over the blurred rail. A failed list
        request leaves it empty, which is only less pretty, so it has no states.
      */}
      {backdrop.length > 0 && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center gap-[5vw] opacity-60 blur-2xl"
          >
            {backdrop.map((src) => (
              <img
                key={src}
                src={assetUrl(src)}
                alt=""
                className="h-[55%] w-auto shrink-0"
                draggable={false}
              />
            ))}
          </div>
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-(--color-rail-bg)/55"></div>
        </>
      )}

      <div className="px-4 pt-6 lg:px-20">
        <BackLink fallback="/shop" label="Back to shop" />
      </div>

      {notFound ? (
        <div className="px-4 pb-24 pt-10 lg:px-20">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <p className="mt-2 text-(--color-rail-muted)">
            Nothing here matches <code className="font-mono">{slug}</code>.
          </p>
          <Button className="mt-6" href="/shop">
            Browse the shop
          </Button>
        </div>
      ) : error ? (
        <div className="px-4 pb-24 pt-10 lg:px-20">
          <Alert tone="danger" title="Could not load this product">
            {error}
          </Alert>
        </div>
      ) : loading ? (
        <div
          className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:px-20"
          aria-busy="true"
        >
          <div className="mx-auto aspect-[200/310] h-[min(52vh,440px)] md:h-[min(62vh,560px)]">
            <Skeleton count={1} height="100%" />
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton count={1} height="2.25rem" />
            <div className="w-2/5">
              <Skeleton count={1} height="1rem" />
            </div>
            <div className="w-1/3">
              <Skeleton count={1} height="1.75rem" />
            </div>
            <Skeleton count={3} height="2.5rem" />
          </div>
          <p className="sr-only" role="status">
            Loading product
          </p>
        </div>
      ) : item && product ? (
        <>
          <div className="mx-auto grid w-full max-w-6xl items-center gap-x-10 gap-y-8 px-4 pb-16 pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:px-20">
            <div className="flex flex-col items-center gap-5">
              {garment ? (
                <>
                  {/* The wire runs up from the hook and is cut off by the section's top edge. */}
                  <div className="relative mx-auto mt-10 aspect-[200/310] h-[min(52vh,440px)] md:h-[min(62vh,560px)]">
                    <GarmentViewer
                      ref={viewerRef}
                      item={garment}
                      reduced={reduced}
                      onSideChange={setSide}
                    />
                  </div>
                  <div
                    role="group"
                    aria-label="Front / Back"
                    className="inline-flex justify-center gap-6"
                  >
                    {FACES.map((face) => (
                      <button
                        key={face}
                        type="button"
                        className={cn(
                          'relative pb-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)',
                          side === face
                            ? 'text-(--color-rail-fg)'
                            : 'text-(--color-rail-muted) hover:text-(--color-rail-fg)',
                        )}
                        aria-pressed={side === face}
                        onClick={() => viewerRef.current?.turnTo(face)}
                      >
                        {face === 'front' ? 'Front' : 'Back'}
                        <span
                          aria-hidden="true"
                          className={cn(
                            'absolute inset-x-0 bottom-0 h-px origin-left bg-(--color-rail-fg) transition-transform duration-300 motion-reduce:transition-none',
                            side === face ? 'scale-x-100' : 'scale-x-0',
                          )}
                        ></span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex aspect-[200/310] h-[min(52vh,440px)] md:h-[min(62vh,560px)] flex-col items-center justify-center gap-2 rounded-2xl bg-(--color-shop-tile) text-sm text-(--color-rail-muted)">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    aria-hidden="true"
                  >
                    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                    <circle cx="9" cy="10" r="1.6" />
                    <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
                  </svg>
                  No image
                </div>
              )}
            </div>

            <RailDetailPanel
              item={item}
              product={product}
              headingLevel={1}
              titleId="product-title"
              onColorChange={setColorIndex}
              onColorHover={(index) => prewarm(photographed, index)}
              onSizeGuide={
                product.sizeChart
                  ? () =>
                      document
                        .getElementById('size-guide')
                        ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
                  : undefined
              }
            />
          </div>
          <ProductGallery
            name={product.name}
            photos={product.gallery}
            sizeChart={product.sizeChart}
          />
        </>
      ) : null}
    </section>
  );
}
