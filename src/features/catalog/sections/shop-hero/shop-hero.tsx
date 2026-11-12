'use client';

/* eslint-disable @next/next/no-img-element -- decorative cut-outs; sizes come from the group's own width */

import { useMemo, type CSSProperties } from 'react';
import { assetUrl } from '@/core/utils/asset-url';
import styles from './shop-hero.module.css';
import { HERO_RAIL_ITEMS } from '@/features/home/sections/hero-banner/hero-rail.data';

/** The pieces shown, in the order they stand left to right: the hero's own photographs. */
const SHOWN = [
  'tshirt-bra-wine',
  'lace-brief-pink',
  'pushup-bra-coral',
  'mesh-bra-babypink',
] as const;

/** Where each piece stands: its tilt, and how far it is nudged down from the row's centre line. */
const POSES = [
  { tilt: -6, drop: '1rem', z: 10 },
  { tilt: 3, drop: '-0.75rem', z: 20 },
  { tilt: -3, drop: '1.25rem', z: 30 },
  { tilt: 6, drop: '0rem', z: 20 },
] as const;

/** Pause between one piece's entrance and the next's, ms. */
const STAGGER = 120;

interface Piece {
  readonly id: string;
  readonly src: string;
  readonly tilt: number;
  readonly drop: string;
  readonly z: number;
}

export interface ShopHeroProps {
  /** "View collection": the page scrolls to its product grid. */
  readonly onBrowse?: () => void;
}

/**
 * The shop's collection banner: headline, one line, a button down to the products, and on the
 * right four pieces standing front-on in a loose, overlapping group.
 *
 * It used to hang side-on garments from a rail, the way the clothing demo does. That reads for
 * a shirt on a hanger, which has thickness to show edge-on. A flat-lay bra or brief has none, and
 * the rail showed it as a thin sliver -- the same problem the home hero had, fixed there the same
 * way: face the pieces to the visitor (`heroImage`, the cut-out cropped to the garment so every
 * piece fills the same box) and let them overlap.
 *
 * **Entrance.** On arrival the pieces rise into place one after another from the left. Skipped
 * under reduced motion. They are decoration (`aria-hidden`); the button is the only control.
 */
export function ShopHero({ onBrowse }: ShopHeroProps) {
  const pieces = useMemo<readonly Piece[]>(
    () =>
      SHOWN.map((id, i) => {
        const item = HERO_RAIL_ITEMS.find((p) => p.id === id);
        if (!item) throw new Error(`hero-rail.data.ts has no piece "${id}"`);
        const pose = POSES[i] ?? POSES[0];
        return { id, src: item.heroImage, ...pose };
      }),
    [],
  );

  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-linear-to-br from-(--color-hero-from) to-(--color-hero-to)">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -z-10 hidden aspect-square w-[26rem] rounded-full bg-(--color-hero-blob)/60 blur-3xl md:block md:-right-8 md:top-1/2 md:-translate-y-1/2"
      ></div>

      <div className="relative z-10 flex min-h-56 flex-col justify-center gap-4 p-8 sm:p-10 md:w-1/2 lg:min-h-72 lg:p-12">
        <h1 className="text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-(--color-rail-fg) lg:text-5xl">
          New
          <br />
          collection
        </h1>
        <p className="max-w-56 text-sm leading-relaxed text-(--color-rail-fg)/70">
          Effortless pieces made for every day.
        </p>
        <button
          type="button"
          className="mt-2 inline-flex h-10 w-fit items-center rounded-lg bg-(--color-rail-fg) px-5 text-sm font-medium text-(--color-rail-bg) outline-none transition-transform hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-2 active:scale-[0.97]"
          onClick={() => onBrowse?.()}
        >
          View collection
        </button>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[54%] items-center py-6 pl-4 pr-5 md:flex"
      >
        {/* Each piece is a share of the group's own width, so the group scales with the banner. */}
        <div className="flex w-full items-center">
          {pieces.map((piece, i) => (
            <div
              key={piece.id}
             
              className={`w-[30%] shrink-0 ${styles.piece}`}
              style={{
                '--delay': `${150 + i * STAGGER}ms`,
                marginLeft: i === 0 ? undefined : '-7%',
                zIndex: piece.z,
                marginTop: piece.drop,
              } as CSSProperties}
            >
              <img
                src={assetUrl(piece.src)}
                alt=""
                draggable={false}
                className="h-auto w-full drop-shadow-[0_12px_14px_rgb(91_39_64/0.22)]"
                style={{ transform: `rotate(${piece.tilt}deg)` }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
