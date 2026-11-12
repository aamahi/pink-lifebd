'use client';

/* The pieces are bare <img>: each one is a cut-out on a transparent canvas sized by its own
   transform, which next/image's wrapper and srcset rewriting would sit in the middle of. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { RecordLink } from '@/components/shared/navigation/record-link';
import { SITE } from '@/core/config/site.config';
import { assetUrl } from '@/core/utils/asset-url';
import { cn } from '@/core/utils/cn';
import { formatMoney } from '@/core/utils/money';
import { HERO_RAIL_ITEMS, type HeroPiece } from '../hero-banner/hero-rail.data';

/** Milliseconds each piece stays in front before the next one comes forward. */
const INTERVAL_MS = 4500;
/** Sideways step of a neighbouring piece, as a percentage of its own width. */
const STEP = 54;
const TILT_DEG = 8;
const SIDE_SCALE = 0.74;

interface Slot {
  readonly piece: HeroPiece;
  readonly index: number;
  /** Signed places from the front, wrapped so the row loops: 0 is the piece in front. */
  readonly offset: number;
  readonly transform: string;
  readonly opacity: number;
  readonly zIndex: number;
}

const PIECES: readonly HeroPiece[] = HERO_RAIL_ITEMS;

/** The piece at `index`; the list is never empty, but the type system cannot know that. */
function pieceAt(index: number): HeroPiece {
  const found = PIECES[index] ?? PIECES[0];
  if (!found) throw new Error('hero-rail.data.ts must list at least one piece');
  return found;
}

/**
 * Home hero for a lingerie store: a still-life of the pieces rather than the clothing rail.
 *
 * The rail (`../hero-banner`) is built for garments photographed on a hanger -- it hangs each
 * one edge-on from a bar and turns it to face the visitor. A flat-lay bra or brief has no
 * hanger and no thickness to show edge-on, so there it reads as a row of thin slivers. Here
 * every piece faces the front: the one in focus stands large and centred, its neighbours
 * tilt away behind it, and the row comes forward one piece at a time.
 *
 * - The pieces are `HERO_RAIL_ITEMS`, the same photographed set the rail uses, shown at
 *   `heroImage` (the cut-out cropped tight to the garment, so every piece fills the same box).
 * - Autoplay advances every {@link INTERVAL_MS}ms and stops while the pointer or keyboard
 *   focus is inside the section, and for visitors who ask for reduced motion. The dots, the
 *   arrows and a click on a neighbouring piece move it by hand.
 * - A piece's price goes through `formatMoney`, so a piece with no stated price shows the
 *   unavailable dash rather than a zero; the section has no async state of its own because
 *   it reads static data.
 */
export function HeroShowcase() {
  const [active, setActive] = useState(0);
  /** True while the pointer or keyboard focus is inside the section. */
  const [held, setHeld] = useState(false);
  const [reduced, setReduced] = useState(false);

  /** The autoplay tick outlives any one render, so it reads these. */
  const heldRef = useRef(held);
  heldRef.current = held;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const step = (by: number): void => {
    const n = PIECES.length;
    setActive((i) => (((i + by) % n) + n) % n);
  };

  const go = (index: number): void => setActive(index);

  useEffect(() => {
    // jsdom, which the unit tests run in, has no matchMedia.
    const media =
      typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    const update = () => setReduced(media?.matches ?? false);
    update();
    media?.addEventListener('change', update);
    const n = PIECES.length;
    const timer = setInterval(() => {
      if (!heldRef.current && !reducedRef.current) {
        setActive((i) => (((i + 1) % n) + n) % n);
      }
    }, INTERVAL_MS);
    return () => {
      clearInterval(timer);
      media?.removeEventListener('change', update);
    };
  }, []);

  const current = pieceAt(active);

  const slots = useMemo<readonly Slot[]>(() => {
    const n = PIECES.length;
    return PIECES.map((piece, index) => {
      const ahead = (((index - active) % n) + n) % n;
      const offset = ahead > n / 2 ? ahead - n : ahead;
      const near = Math.abs(offset) <= 1;
      return {
        piece,
        index,
        offset,
        transform:
          `translate(-50%, -50%) translateX(${offset * STEP}%) ` +
          `rotate(${offset * TILT_DEG}deg) scale(${offset === 0 ? 1 : SIDE_SCALE})`,
        opacity: offset === 0 ? 1 : near ? 0.55 : 0,
        zIndex: 20 - Math.abs(offset),
      };
    });
  }, [active]);

  return (
    <section
      className="relative isolate overflow-hidden bg-linear-to-b from-(--color-hero-from) to-(--color-hero-to) font-jakarta text-(--color-rail-fg)"
      aria-labelledby="hero-title"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[6%] -z-10 select-none text-center font-display text-[17vw] font-semibold leading-none whitespace-nowrap text-(--color-hero-ink)/[0.04]"
      >
        {SITE.name}
      </span>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -z-10 aspect-square w-[min(90vw,640px)] rounded-full bg-(--color-hero-blob)/60 blur-3xl max-lg:left-1/2 max-lg:top-[44%] max-lg:-translate-x-1/2 lg:right-[4%] lg:top-1/2 lg:-translate-y-1/2"
      ></div>

      <div className="mx-auto grid max-w-[1320px] items-center gap-3 px-4 pb-8 pt-8 sm:gap-8 sm:pb-10 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-6 lg:px-20 lg:pb-16 lg:pt-14">
        <div className="text-center lg:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-(--color-rail-muted)">
            New season · Lingerie
          </p>
          <h1
            id="hero-title"
            className="mt-4 font-display text-5xl font-semibold leading-[1.05] md:text-6xl xl:text-7xl"
          >
            Soft on you.
            <br />
            Sure of you.
          </h1>
          <p className="mx-auto mt-5 max-w-[44ch] text-[15px] leading-relaxed text-(--color-rail-muted) lg:mx-0">
            Seamless, lace and cotton bras and briefs, cut for comfort from the first hour to the
            last.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link
              href="/shop?collection=bras"
              className="rounded-full bg-(--color-rail-fg) px-6 py-3 text-sm font-medium text-(--color-rail-bg) shadow-sm outline-none transition-[transform,box-shadow] hover:-translate-y-px hover:text-(--color-rail-bg) hover:shadow-md focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:transition-none"
            >
              Shop bras
            </Link>
            <Link
              href="/shop?collection=panties"
              className="rounded-full border border-(--color-rail-fg)/25 bg-(--color-rail-bg)/60 px-6 py-3 text-sm font-medium text-(--color-rail-fg) outline-none backdrop-blur-sm transition-[transform,background-color] hover:-translate-y-px hover:bg-(--color-rail-bg) hover:text-(--color-rail-fg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:transition-none"
            >
              Shop panties
            </Link>
          </div>
        </div>

        <div>
          <div
            className="relative mx-auto h-[265px] w-full max-w-[600px] sm:h-[430px] lg:h-[500px]"
            role="group"
            aria-roledescription="carousel"
            aria-label="Featured pieces"
          >
            <div
              aria-hidden="true"
              className="absolute bottom-[4%] left-1/2 h-7 w-[58%] -translate-x-1/2 rounded-[50%] bg-(--color-hero-ink)/20 blur-xl"
            ></div>
            {slots.map((slot) => {
              const distance = Math.abs(slot.offset);
              return (
                <button
                  key={slot.piece.id}
                  type="button"
                  className={cn(
                    'absolute left-1/2 top-1/2 h-[82%] w-[64%] cursor-pointer outline-none transition-[transform,opacity] duration-700 ease-[cubic-bezier(.22,1,.36,1)] focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) motion-reduce:transition-none',
                    (slot.offset === 0 || distance > 1) && 'pointer-events-none',
                  )}
                  style={{
                    transform: slot.transform,
                    opacity: slot.opacity,
                    zIndex: slot.zIndex,
                  }}
                  tabIndex={distance === 1 ? 0 : -1}
                  aria-hidden={distance > 1 || slot.offset === 0 ? 'true' : undefined}
                  aria-label={'Show ' + slot.piece.name}
                  onClick={() => go(slot.index)}
                >
                  <img
                    src={assetUrl(slot.piece.heroImage)}
                    alt={slot.offset === 0 ? slot.piece.name : ''}
                    draggable="false"
                    fetchPriority={slot.index === 0 ? 'high' : undefined}
                    loading={slot.index === 0 ? undefined : 'lazy'}
                    className="h-full w-full object-contain drop-shadow-2xl"
                  />
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex flex-col items-center gap-3 text-center">
            <div aria-live="polite" className="min-h-[3.4rem]">
              <p className="text-[15px] font-medium [&_a]:text-(--color-rail-fg)">
                <RecordLink route={['/product', current.slug]}>{current.name}</RecordLink>
              </p>
              <p className="mt-1 text-sm text-(--color-rail-muted)">
                {formatMoney(current.price, { compact: true })}{' '}
                {current.compareAtPrice !== null ? (
                  <span className="ml-1.5 line-through opacity-70">
                    {formatMoney(current.compareAtPrice, { compact: true })}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-full border border-(--color-rail-fg)/20 bg-(--color-rail-bg)/70 outline-none transition-colors hover:bg-(--color-rail-bg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
                aria-label="Previous piece"
                onClick={() => step(-1)}
              >
                <span aria-hidden="true">←</span>
              </button>
              <div className="flex items-center gap-2">
                {PIECES.map((piece, i) => (
                  <button
                    key={piece.id}
                    type="button"
                    className={cn(
                      'h-1.5 rounded-full outline-none transition-[width,background-color] duration-300 focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) motion-reduce:transition-none',
                      active === i
                        ? 'w-6 bg-(--color-rail-fg)'
                        : 'w-1.5 bg-(--color-rail-fg)/25 hover:bg-(--color-rail-fg)/45',
                    )}
                    aria-label={'Show ' + piece.name}
                    aria-current={active === i ? 'true' : undefined}
                    onClick={() => go(i)}
                  ></button>
                ))}
              </div>
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-full border border-(--color-rail-fg)/20 bg-(--color-rail-bg)/70 outline-none transition-colors hover:bg-(--color-rail-bg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
                aria-label="Next piece"
                onClick={() => step(1)}
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
