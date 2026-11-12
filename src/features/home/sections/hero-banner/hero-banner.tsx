'use client';

/* The rail's photos are bare <img>: RailPhysics writes transforms and opacity onto the nodes around
   them every frame, which next/image's wrapper would sit in the middle of. */
/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import Link from 'next/link';
import { SpecularLight } from '@/components/ui/specular-light';
import { assetUrl } from '@/core/utils/asset-url';
import { cn } from '@/core/utils/cn';
import { formatMoney } from '@/core/utils/money';
import { HERO_RAIL_ITEMS } from './hero-rail.data';
import { RailDetail } from './rail-detail';
import { RailPhysics, type RailLive, type RailSize } from './rail-physics';
import { RailPointer } from './rail-pointer';
import {
  ASPECT,
  CAROUSEL_H,
  DEFAULT_LABELS,
  GAP,
  HOOK_TOP,
  MAX_H,
  MIN_WIDE_H,
  RAIL_R,
  REST,
  VB_H,
  clamp,
  footprint,
  photoMask,
  sideWidth,
  type RailGarment,
} from './rail.model';

// No count in the copy: on a wide screen the rail repeats pieces to fill itself.
const EYEBROW = 'New season · Fresh on the rail';
const HEADING = 'A clothing rail you can handle, right on the page.';
const CAPTION = 'Brush along the rail, slide a hanger, lift a piece to see the back.';
const LABELS = DEFAULT_LABELS;
const FACES = ['front', 'back'] as const;
const HOOK_PERCENT = (HOOK_TOP / VB_H) * 100;

const tagText = (price: number | null): string => formatMoney(price, { compact: true });

export interface HeroBannerProps {
  items?: readonly RailGarment[];
  /** Turn pieces to the front one by one until the visitor interacts. */
  autoplay?: boolean;
  /** Milliseconds each piece faces the front during autoplay. */
  interval?: number;
}

/**
 * Home's first section: a clothing rail the visitor can handle. Port of
 * the React `ClothingRailHero` with its motion intact -- pieces hang side-on,
 * turn to the front under the pointer (or one by one on autoplay), shoulder
 * their neighbours aside, swing on their hooks when brushed or dragged, and
 * lift into a detail view that spins to show the back.
 *
 * The physics is `RailPhysics` and the pointer gestures are `RailPointer`;
 * this file owns state, layout and the markup. Static content, so no async
 * branches -- the loading/empty/error demonstration is `featured-products`.
 */
export function HeroBanner({
  items = HERO_RAIL_ITEMS,
  autoplay = true,
  interval = 2600,
}: HeroBannerProps) {
  const uid = useId();

  const [size, setSize] = useState<RailSize>({ width: 0, h: 300, carousel: false });
  const [active, setActive] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(autoplay);
  const [lifted, setLifted] = useState<number | null>(null);
  /** How many pieces hang, set by `measure`; never fewer than `items`. */
  const [fill, setFill] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const captionRef = useRef<HTMLDivElement>(null);

  /** What `measure` (a ResizeObserver callback) reads, since it outlives any one render. */
  const latest = useRef({ items, fill, size });
  latest.current = { items, fill, size };

  /**
   * The pieces actually on the rail: `items` in order, repeated from the
   * start when the rail is wider than they fill. Without this, the 400px height
   * cap leaves a wide screen with bare rail either side -- ten pieces span about
   * 920px at full size. Repeats get a suffixed id so the React key stays unique.
   */
  const rail = useMemo<RailGarment[]>(() => {
    const n = Math.max(items.length, fill);
    const out: RailGarment[] = [];
    for (let k = 0; k < n && items.length > 0; k++) {
      const item = items[k % items.length];
      if (!item) continue;
      const round = Math.floor(k / items.length);
      out.push({ ...item, id: round ? `${item.id}~${round}` : item.id });
    }
    return out;
  }, [items, fill]);

  const count = rail.length;
  const current = active === null ? null : (rail[active] ?? null);
  /** The lifted piece and its index, or null. An object so index 0 is not falsy. */
  const opened = (() => {
    const item = openIndex === null ? undefined : rail[openIndex];
    return openIndex === null || !item ? null : { item, index: openIndex };
  })();

  const geometry = useMemo(() => {
    const h = size.h;
    const railY = Math.round(h * 0.07) + 10;
    return {
      h,
      boxW: h * ASPECT,
      railY,
      railR: Math.max(3, Math.round((RAIL_R / VB_H) * h * 10) / 10),
      slotTop: railY - (HOOK_TOP / VB_H) * h,
      // Every piece is a full-canvas photo, so the lowest hem is the canvas foot.
      stageH: Math.round(railY + h + h * 0.05 + 12),
      blur: Math.max(3, h * 0.022).toFixed(1),
      tagTop: (32 / VB_H) * h,
    };
  }, [size.h]);

  /** The simulation, its plain-object view of the state, and the pointer gestures that drive it. */
  const apiRef = useRef<{ choose: (index: number | null) => void; stop: () => void }>({
    choose: () => undefined,
    stop: () => undefined,
  });
  const [{ live, physics, pointer }] = useState(() => {
    const live: RailLive = {
      active: null,
      size: { width: 0, h: 300, carousel: false },
      reduced: false,
      count: 0,
      openIndex: null,
      carouselIndex: 0,
      sideWidths: [],
    };
    const physics = new RailPhysics(live);
    const pointer = new RailPointer({
      physics,
      live,
      stage: () => stageRef.current as HTMLElement,
      choose: (index) => apiRef.current.choose(index),
      stop: () => apiRef.current.stop(),
    });
    return { live, physics, pointer };
  });

  const carouselIndex = size.carousel ? (active ?? live.carouselIndex) : null;

  /**
   * Copy state into the plain object the physics reads every frame.
   * Called directly at the top of the retarget pass, not left to an effect:
   * effects are scheduled, and the first layout ran before one had filled
   * `sideWidths`, which left every target empty and the rail in a heap.
   */
  const syncLive = (): void => {
    // `live.active` is not copied: `choose` and `measure` write it synchronously, so it is always
    // ahead of or equal to the rendered `active`, and a render that lags a fast hover must not
    // overwrite it with the piece that was in front one event ago.
    live.size = size;
    live.reduced = reduced;
    live.count = count;
    live.openIndex = openIndex;
    live.sideWidths = rail.map(sideWidth);
  };

  /** Turn `index` to the front (null: none), rocking the neighbours it shoulders aside. */
  const choose = useCallback(
    (index: number | null): void => {
      const old = live.active;
      if (old === index) return;
      const p = physics;
      if (index !== null) {
        p.impulse(index - 1, -30);
        p.impulse(index + 1, 30);
        live.carouselIndex = index;
      }
      if (old !== null) {
        p.impulse(old - 1, 14);
        p.impulse(old + 1, -14);
      }
      live.active = index;
      setActive(index);
    },
    [live, physics],
  );

  const stop = useCallback((): void => setPlaying(false), []);
  apiRef.current = { choose, stop };

  useEffect(() => setPlaying(autoplay), [autoplay]);

  /**
   * Fit the rail to `width`. Below MIN_WIDE_H a piece it becomes a carousel of
   * the real collection. Otherwise, once pieces reach the MAX_H cap, hang as
   * many as fit at that height -- in units of piece height, n pieces at rest
   * plus one turned to the front take `n * restK + (activeK - restK)` -- keeping
   * clear of the end brackets, and up to four rounds of the collection.
   */
  const measure = useCallback(
    (width: number): void => {
      const base = latest.current.items;
      const widths = base.map(sideWidth);
      const sideW = widths.reduce((sum, w) => sum + w, 0) / Math.max(1, widths.length);
      const restK = footprint(1, REST, sideW) + GAP;
      const activeK = footprint(1, 0, sideW) + GAP;
      const span = (n: number) => n * restK + (activeK - restK);
      const usable = width - 24;
      const carousel = usable / span(base.length) < MIN_WIDE_H;
      let n = base.length;
      if (!carousel) {
        const room = (usable - 2 * MAX_H * 0.06) / MAX_H;
        const fits = Math.floor((room - (activeK - restK)) / restK);
        n = Math.min(base.length * 4, Math.max(base.length, fits));
      }
      const h = Math.round(
        carousel
          ? Math.min(CAROUSEL_H, Math.max(220, width * 0.86))
          : Math.min(MAX_H, usable / span(n)),
      );
      if (latest.current.fill !== n) {
        // A new piece count rebuilds the rail, so drop a front piece that may no longer exist.
        setActive(null);
        live.active = null;
        latest.current.fill = n;
        setFill(n);
      }
      const old = latest.current.size;
      if (Math.abs(old.width - width) < 0.5 && old.carousel === carousel && old.h === h) return;
      const next = { width, h, carousel };
      latest.current.size = next;
      setSize(next);
    },
    [live],
  );

  // Keep the physics' view of the state current once the DOM it reads from exists.
  useEffect(() => {
    syncLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, active, reduced, count, openIndex, rail]);

  // After the first paint: follow reduced motion and the stage's width.
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([box]) => box && measure(box.contentRect.width));
    measure(stage.clientWidth);
    observer.observe(stage);
    return () => {
      media.removeEventListener('change', update);
      observer.disconnect();
      physics.destroy();
    };
  }, [measure, physics]);

  /** Map each piece's layers by data attribute; optional layers come back null. */
  const collect = (): void => {
    physics.els = slotRefs.current
      .filter((slot): slot is HTMLButtonElement => slot !== null)
      .map((slot) => {
        const q = (sel: string) => slot.querySelector<HTMLElement>(sel);
        return {
          slot,
          swing: q('[data-swing]'),
          turn: q('[data-turn]'),
          side: q('[data-face="side"]'),
          drape: q('[data-drape]'),
          shade: q('[data-shade]'),
          shadow: q('[data-shadow]'),
          tag: q('[data-tag]'),
        };
      });
  };

  // After the DOM for this layout exists: re-collect each piece's layers and
  // re-aim the springs. React's useLayoutEffect on [size, active, count, reduced].
  useLayoutEffect(() => {
    if (!size.width) return;
    syncLive();
    collect();
    physics.retarget(
      size.carousel ? (live.active ?? live.carouselIndex) : live.active,
      pointer.swipe,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, active, reduced, rail, openIndex]);

  // First layout only: brush a hand along the rail so every hanger rocks once.
  // The timers are cleared on unmount, not on the effect's re-run -- a second
  // size from the resize observer would otherwise cancel the brush for good.
  const brushed = useRef(false);
  const brushTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const timers = brushTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (!size.width || brushed.current || reduced) return;
    brushed.current = true;
    rail.forEach((_, i) =>
      brushTimers.current.push(setTimeout(() => physics.impulse(i, 46 - i * 2.5), 120 + i * 55)),
    );
  }, [size.width, reduced, rail, physics]);

  // Fade the caption in whenever its subject changes, as the original's keyed remount did.
  useEffect(() => {
    const el = captionRef.current;
    if (el && !reduced) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease' });
    }
  }, [current, reduced]);

  // Autoplay: first piece after 1.1s, then one every `interval`, until stopped.
  useEffect(() => {
    if (!playing || reduced || openIndex !== null) return;
    if (count === 0 || !size.width) return;
    const advance = () => {
      const a = live.active;
      choose(a === null ? 0 : (a + 1) % count);
    };
    const timer = setTimeout(advance, active === null ? 1100 : interval);
    return () => clearTimeout(timer);
  }, [interval, count, playing, reduced, openIndex, size, active, live, choose]);

  const open = (index: number): void => {
    stop();
    choose(index);
    setOpenIndex(index);
  };

  const sourceFor = (index: number) => (): DOMRect | null =>
    slotRefs.current[index]?.querySelector('[data-turn]')?.getBoundingClientRect() ?? null;

  /** Dialog gone: unhide the piece, swing it as it lands, and hand focus back to it. */
  const refocus = useRef<number | null>(null);
  const onDetailClosed = (index: number): void => {
    setOpenIndex(null);
    setLifted(null);
    physics.impulse(index, (index % 2 ? 1 : -1) * 44);
    refocus.current = index;
  };
  useEffect(() => {
    if (openIndex !== null || refocus.current === null) return;
    slotRefs.current[refocus.current]?.focus({ preventScroll: true });
    refocus.current = null;
  }, [openIndex]);

  const onSlotFocus = (i: number): void => {
    setFocusIndex(i);
    if (pointer.id < 0) {
      stop();
      choose(i);
    }
  };

  /** Keyboard activation (detail 0) opens; a pointer opens only after its own press resolved here. */
  const onSlotClick = (event: ReactMouseEvent<HTMLButtonElement>, i: number): void => {
    const pending = pointer.pendingOpen;
    pointer.pendingOpen = -1;
    if (event.detail === 0 || pending === i) open(i);
  };

  const onStageLeave = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse' || pointer.id >= 0 || size.carousel) return;
    if (document.activeElement?.matches('[data-garment]:focus-visible')) return;
    choose(null);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    stop();
    const from = active ?? focusIndex;
    const last = count - 1;
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? last
          : clamp(from + (event.key === 'ArrowRight' ? 1 : -1), 0, last);
    setFocusIndex(next);
    choose(next);
    slotRefs.current[next]?.focus({ preventScroll: true });
  };

  return (
    <>
      <section
        data-slot="clothing-rail-hero"
        data-mode={size.carousel ? 'carousel' : 'rail'}
        aria-roledescription="clothing rail"
        className="relative isolate flex min-h-[calc(100svh-92px)] w-full flex-col justify-center overflow-hidden bg-(--color-rail-bg) font-system text-(--color-rail-fg)"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(120% 70% at 18% 0%, color-mix(in oklab, var(--color-rail-fg) 7%, transparent), transparent 62%), linear-gradient(to bottom, transparent 55%, color-mix(in oklab, var(--color-rail-fg) 5%, transparent))',
          }}
        ></div>

        <header className="relative z-10 flex flex-col items-center gap-2 px-6 pt-8 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-(--color-rail-muted)">
            {EYEBROW}
          </p>
          <h1 className="text-balance text-2xl font-medium tracking-tight sm:text-3xl">
            {HEADING}
          </h1>
        </header>

        <div
          ref={stageRef}
          data-stage
          role="group"
          aria-label={HEADING}
          className="relative mt-5 w-full touch-pan-y select-none"
          style={{
            overflowX: 'clip',
            height: `${geometry.stageH}px`,
            visibility: size.width ? undefined : 'hidden',
          }}
          onPointerMove={(e) => pointer.move(e.nativeEvent)}
          onPointerDown={(e) => pointer.down(e.nativeEvent)}
          onPointerUp={(e) => pointer.finish(e.nativeEvent, false)}
          onPointerCancel={(e) => pointer.finish(e.nativeEvent, true)}
          onPointerLeave={(e) => onStageLeave(e.nativeEvent)}
          onKeyDown={onKeyDown}
        >
          {/* The rail: steel bar with its contact shadow, knurl texture and two end brackets. */}
          <div
            aria-hidden="true"
            data-rail
            className="pointer-events-none absolute inset-x-0 z-0"
            style={{
              top: `${geometry.railY - geometry.railR}px`,
              height: `${geometry.railR * 2}px`,
            }}
          >
            <div
              className="absolute inset-x-0 h-3 rounded-full bg-(--color-rail-fg)/10 blur-[5px]"
              style={{ top: `${geometry.railR * 2 + 1}px` }}
            ></div>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'linear-gradient(to bottom, color-mix(in oklab, var(--color-rail-muted) 35%, white) 0%, white 18%, color-mix(in oklab, var(--color-rail-muted) 70%, white) 38%, var(--color-rail-muted) 62%, color-mix(in oklab, var(--color-rail-muted) 55%, black) 100%)',
                boxShadow: '0 1px 0 color-mix(in oklab, var(--color-rail-fg) 18%, transparent)',
              }}
            ></div>
            <div
              className="absolute inset-0 rounded-full opacity-40 mix-blend-overlay"
              style={{
                background:
                  'repeating-linear-gradient(90deg, transparent 0 2px, color-mix(in oklab, white 40%, transparent) 2px 3px, transparent 3px 7px)',
              }}
            ></div>
            {(['left', 'right'] as const).map((end) => (
              <div
                key={end}
                className="absolute top-1/2 h-7 w-4 -translate-y-1/2 rounded-[3px]"
                style={{
                  left: end === 'left' ? '6px' : undefined,
                  right: end === 'right' ? '6px' : undefined,
                  background:
                    'linear-gradient(to right, color-mix(in oklab, var(--color-rail-muted) 60%, white), var(--color-rail-muted) 55%, color-mix(in oklab, var(--color-rail-muted) 60%, black))',
                  boxShadow: '0 3px 6px color-mix(in oklab, var(--color-rail-fg) 18%, transparent)',
                }}
              >
                <span className="absolute left-1/2 top-1 size-1 -translate-x-1/2 rounded-full bg-(--color-rail-fg)/35"></span>
                <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-(--color-rail-fg)/35"></span>
              </div>
            ))}
          </div>

          {rail.map((item, i) => (
            // transform / opacity on this subtree are written per frame by RailPhysics; never set them here.
            <button
              key={item.id}
              ref={(el) => {
                slotRefs.current[i] = el;
              }}
              type="button"
              data-garment={i}
              data-front={active === i ? '' : undefined}
              tabIndex={i === (active ?? focusIndex) ? 0 : -1}
              aria-label={item.name}
              aria-describedby={`${uid}-caption`}
              aria-pressed={active === i}
              className="absolute left-0 cursor-pointer rounded-xl outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-rail-ring)"
              style={{
                top: `${geometry.slotTop}px`,
                width: `${geometry.boxW}px`,
                height: `${geometry.h}px`,
                zIndex: active === i ? 30 : 10 + i,
                visibility: lifted === i ? 'hidden' : undefined,
              }}
              onFocus={() => onSlotFocus(i)}
              onClick={(e) => onSlotClick(e, i)}
            >
              <span
                data-swing
                className="absolute inset-0"
                style={{ transformOrigin: `50% ${HOOK_PERCENT}%` }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{ filter: `blur(${geometry.blur}px)` }}
                >
                  <span
                    data-shadow
                    className="absolute inset-0 block bg-black opacity-[0.16]"
                    style={{ mask: photoMask(assetUrl(item.image)) }}
                  ></span>
                </span>

                {item.sideImage ? (
                  <span data-face="side" className="absolute inset-0">
                    <img
                      src={assetUrl(item.sideImage)}
                      alt=""
                      draggable="false"
                      className="pointer-events-none absolute inset-x-0 bottom-0 top-0 h-full w-full select-none object-contain object-top"
                    />
                  </span>
                ) : null}

                <span
                  data-turn
                  className="absolute inset-0 rounded-lg [transform-style:preserve-3d]"
                >
                  {FACES.map((side) => {
                    const photo = side === 'back' ? (item.backImage ?? item.image) : item.image;
                    return (
                      <span
                        key={side}
                        data-face={side}
                        className="absolute inset-0 [backface-visibility:hidden]"
                        style={side === 'back' ? { transform: 'rotateY(180deg)' } : undefined}
                      >
                        <span
                          data-drape={side === 'front' ? '' : undefined}
                          className="absolute inset-0 origin-top [transform:skewX(var(--drape,0deg))]"
                          style={
                            side === 'back'
                              ? { transform: 'skewX(calc(var(--drape, 0deg) * -1))' }
                              : undefined
                          }
                        >
                          <img
                            src={assetUrl(photo)}
                            alt=""
                            draggable="false"
                            className="pointer-events-none absolute inset-x-0 bottom-0 top-0 h-full w-full select-none object-contain object-top"
                          />
                          <span
                            data-shade={side === 'front' ? '' : undefined}
                            className="pointer-events-none absolute inset-0 bg-black"
                            style={{
                              opacity: 'var(--shade, 0.2)',
                              mask: photoMask(assetUrl(photo)),
                            }}
                          ></span>
                        </span>
                      </span>
                    );
                  })}
                </span>

                {item.price !== null ? (
                  <span
                    data-tag
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 origin-top"
                    style={{ top: `${geometry.tagTop}px` }}
                  >
                    <span className="block h-[14px] w-px translate-x-[3px] bg-(--color-rail-fg)/35"></span>
                    <span className="block -translate-x-1/2 translate-x-[3px] whitespace-nowrap rounded-[3px] border border-(--color-rail-fg)/10 bg-(--color-rail-card) px-1.5 pb-1 pt-2 text-[9px] font-semibold leading-none tracking-wide text-(--color-rail-fg) shadow-[0_2px_6px_color-mix(in_oklab,var(--color-rail-fg)_18%,transparent)]">
                      <span className="absolute left-1/2 top-[3px] size-[3px] -translate-x-1/2 rounded-full bg-(--color-rail-fg)/30"></span>
                      {tagText(item.price)}
                    </span>
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>

        {size.carousel && count > 1 ? (
          <div
            className="relative z-10 mt-1 flex justify-center gap-1.5"
            role="group"
            aria-label={LABELS.show}
          >
            {rail.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={LABELS.show + ' ' + item.name}
                aria-current={carouselIndex === i}
                className={cn(
                  'h-1.5 rounded-full outline-none transition-[width,background-color] duration-300 focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)',
                  carouselIndex === i
                    ? 'w-6 bg-(--color-rail-fg)'
                    : 'w-1.5 bg-(--color-rail-fg)/25 hover:bg-(--color-rail-fg)/45',
                )}
                onClick={() => {
                  stop();
                  choose(i);
                }}
              ></button>
            ))}
          </div>
        ) : null}

        <div className="relative z-10 flex flex-col items-center gap-4 px-6 pb-8 pt-4 text-center">
          <div
            ref={captionRef}
            id={`${uid}-caption`}
            aria-live="polite"
            className="min-h-[3.25rem]"
          >
            <p className="text-sm font-medium">{current?.name ?? CAPTION}</p>
            {current?.description ? (
              <p className="mx-auto mt-1 max-w-[42ch] text-[13px] leading-relaxed text-(--color-rail-muted)">
                {current.description}
              </p>
            ) : null}
          </div>
          <Link
            href="/shop"
            className="relative isolate rounded-full bg-(--color-rail-fg) px-5 py-2.5 text-sm font-medium text-(--color-rail-bg) shadow-sm outline-none transition-[transform,box-shadow] hover:-translate-y-px hover:text-(--color-rail-bg) hover:shadow-md focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:transition-none"
          >
            <SpecularLight baseColor="#3f3f46" />
            View collection
          </Link>
        </div>
      </section>

      {/* Outside the section: its isolate stacking context would trap a fixed dialog under the sticky header. */}
      {opened ? (
        <RailDetail
          item={opened.item}
          labels={LABELS}
          reduced={reduced}
          titleId={`${uid}-detail-title`}
          source={sourceFor(opened.index)}
          onLift={(isLifted) => setLifted(isLifted ? opened.index : null)}
          onClosed={() => onDetailClosed(opened.index)}
        />
      ) : null}
    </>
  );
}
