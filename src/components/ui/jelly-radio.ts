'use client';

import { useEffect, useRef, type RefObject } from 'react';

/** One spring-driven number: motion's `{ type: 'spring', stiffness, damping, mass }`. */
interface Spring {
  value: number;
  velocity: number;
  target: number;
  stiffness: number;
  damping: number;
  mass: number;
  /** performance.now() before which the spring holds still: the stagger delay. */
  startAt: number;
  /** Below this distance and speed it snaps to rest. */
  rest: number;
}

interface Chip {
  el: HTMLElement;
  x: Spring;
  sx: Spring;
  sy: Spring;
}

const spring = (value: number, rest: number): Spring => ({
  value,
  velocity: 0,
  target: value,
  stiffness: 1,
  damping: 1,
  mass: 1,
  startAt: 0,
  rest,
});

/** motion's spring() helper: damping from stiffness, mass and a "bounce" of 1 - damping ratio. */
function retune(s: Spring, target: number, k: number, m: number, bounce: number, delayS: number) {
  s.target = target;
  s.stiffness = k;
  s.mass = m;
  s.damping = 2 * Math.sqrt(k * m) * (1 - bounce);
  s.startAt = performance.now() + delayS * 1000;
}

function settled(s: Spring): boolean {
  return Math.abs(s.value - s.target) < s.rest && Math.abs(s.velocity) < s.rest * 10;
}

export interface JellyRadioOptions {
  /** How much the chosen chip grows (0.2 = 20%). */
  swell?: number;
  /** Extra px the neighbours are shoved on top of half the chosen chip's growth. */
  barge?: number;
  /** How much every other chip shrinks. */
  shrink?: number;
  jelly?: number;
  bounce?: number;
  /** ms each step away from the chosen chip waits before moving. */
  stagger?: number;
  stiffness?: number;
}

type Options = Required<JellyRadioOptions>;

/** The minimum of a keyboard event the motion reads; a React `KeyboardEvent` satisfies it. */
export type JellyKeyEvent = Pick<KeyboardEvent, 'key' | 'target' | 'preventDefault'>;

/**
 * React Bits' `JellyRadio` motion on whatever chips a radiogroup already renders.
 *
 * On a change the chosen chip swells by `swell`, wide before tall -- its X
 * scale springs stiffer and looser than its Y scale, and Y starts 50ms later --
 * while every other chip shrinks by `shrink` and is shoved away from it by half
 * the chosen chip's growth plus `barge` px. The shove ripples outward: each
 * step from the chosen chip waits `stagger` ms and springs 12% softer, to a
 * floor at three steps. A chip already in motion is retargeted at once, keeping
 * its velocity, so fast clicking stays fluid. All constants are the original's.
 *
 * Chips are the group's direct `[role=radio]` children; this writes only their
 * `transform` and `tabindex`. Selection itself stays with the component -- the
 * motion follows the index it is given. Arrow keys, Home and End move the selection by
 * clicking the target chip (so the component's own click handler commits it) and land
 * instantly, as the original does for keyboard commits. The group needs room around it for
 * the swell: chips are transformed, so layout does not grow to fit them.
 *
 * Framework-agnostic on purpose (`useJellyRadio` below is the only React in this file), so the
 * spring maths reads the same as the Angular directive it came from.
 */
class JellyMotion {
  private chips: Chip[] = [];
  private applied = Number.NaN;
  private instantNext = false;
  private raf = 0;
  private last = 0;
  private readonly reduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(
    private readonly group: HTMLElement,
    private readonly options: () => Options,
  ) {}

  /** Follow the selection. The first application, and any after a keyboard move, lands without motion. */
  follow(sel: number): void {
    this.collect();
    if (sel === this.applied) return;
    const instant = Number.isNaN(this.applied) || this.instantNext;
    this.instantNext = false;
    this.applied = sel;
    this.apply(sel, instant);
  }

  /** A reflow (fonts landing, a resize) re-measures and snaps to rest. */
  remeasure(): void {
    this.apply(this.applied, true);
  }

  /**
   * Chips added or removed while the selection index stays put -- the home
   * "Best sellers" pills render All and Popular first and the categories
   * land between them once loaded, with All still at 0 -- would never be
   * reached by `follow`, which only runs on a new index, and
   * sat untransformed beside chips at their shrunk rest. Pick them up and
   * snap everything to rest.
   */
  refreshChips(): void {
    const before = this.chips;
    this.collect();
    if (this.chips !== before) this.apply(this.applied, true);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Pick up the current chips, keeping the springs of any that were already there. */
  private collect(): void {
    const els = [...this.group.querySelectorAll<HTMLElement>(':scope > [role="radio"]')];
    if (els.length === this.chips.length && els.every((el, i) => this.chips[i]?.el === el)) return;
    this.chips = els.map(
      (el) =>
        this.chips.find((c) => c.el === el) ?? {
          el,
          x: spring(0, 0.01),
          sx: spring(1, 0.0005),
          sy: spring(1, 0.0005),
        },
    );
  }

  private apply(sel: number, instant: boolean): void {
    if (Number.isNaN(sel)) return;
    const o = this.options();
    const rtl = getComputedStyle(this.group).direction === 'rtl';
    const chosen = this.chips[sel];
    const push = chosen ? (chosen.el.offsetWidth * o.swell) / 2 + o.barge : 0;
    const j = o.jelly;
    const bounce = o.bounce;
    this.chips.forEach((chip, i) => {
      chip.el.tabIndex = i === sel || (sel < 0 && i === 0) ? 0 : -1;
      const far = sel < 0 ? 0 : Math.abs(i - sel);
      const x = sel < 0 ? 0 : Math.sign(i - sel) * (rtl ? -1 : 1) * push;
      const s = i === sel ? 1 + o.swell : 1 - o.shrink;
      if (instant || this.reduced) {
        for (const [sp, to] of [
          [chip.x, x],
          [chip.sx, s],
          [chip.sy, s],
        ] as const) {
          sp.value = sp.target = to;
          sp.velocity = 0;
        }
        this.paint(chip);
        return;
      }
      const k = o.stiffness * (1 - 0.12 * Math.min(far, 3));
      const moving = !settled(chip.x) || !settled(chip.sx) || !settled(chip.sy);
      const delay = moving ? 0 : (far * o.stagger) / 1000;
      retune(chip.x, x, k, 0.9, bounce, delay);
      retune(
        chip.sx,
        s,
        k * (1 + 0.24 * j),
        0.9 - 0.1 * j,
        Math.min(0.85, bounce + 0.3 * j),
        delay,
      );
      retune(chip.sy, s, k * (1 - 0.14 * j), 0.9 + 0.05 * j, bounce, delay + 0.05 * j);
    });
    if (!instant && !this.reduced && !this.raf) {
      this.last = 0;
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  private paint(chip: Chip): void {
    chip.el.style.transform = `translateX(${chip.x.value.toFixed(2)}px) scale(${chip.sx.value.toFixed(4)}, ${chip.sy.value.toFixed(4)})`;
  }

  /** Semi-implicit Euler at 240 Hz sub-steps: stable for these stiffnesses at any frame rate. */
  private readonly frame = (now: number): void => {
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    const steps = Math.max(1, Math.ceil(dt * 240));
    const h = dt / steps;
    let busy = false;
    for (const chip of this.chips) {
      for (const s of [chip.x, chip.sx, chip.sy]) {
        if (now < s.startAt) {
          busy = true;
          continue;
        }
        for (let i = 0; i < steps; i++) {
          const accel = (-s.stiffness * (s.value - s.target) - s.damping * s.velocity) / s.mass;
          s.velocity += accel * h;
          s.value += s.velocity * h;
        }
        if (settled(s)) {
          s.value = s.target;
          s.velocity = 0;
        } else busy = true;
      }
      this.paint(chip);
    }
    this.raf = busy ? requestAnimationFrame(this.frame) : 0;
  };

  /** Next enabled chip from `i` in direction `dir`, wrapping; `i` itself if none. */
  private stepFrom(i: number, dir: number): number {
    const n = this.chips.length;
    let j = i;
    for (let tries = 0; tries < n; tries++) {
      j = (j + dir + n) % n;
      const el = this.chips[j]?.el;
      if (el && !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true') {
        return j;
      }
    }
    return i;
  }

  onKeyDown(event: JellyKeyEvent): void {
    const from = this.chips.findIndex((c) => c.el === event.target);
    if (from < 0) return;
    const n = this.chips.length;
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? this.stepFrom(from, 1)
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? this.stepFrom(from, -1)
          : event.key === 'Home'
            ? this.stepFrom(-1, 1)
            : event.key === 'End'
              ? this.stepFrom(n, -1)
              : null;
    if (next === null) return;
    event.preventDefault();
    const target = this.chips[next]?.el;
    if (!target) return;
    if (next !== this.applied) {
      this.instantNext = true;
      target.click();
    }
    target.focus();
  }
}

export interface JellyRadio<T extends HTMLElement> {
  /** Attach to the `role="radiogroup"` element. */
  ref: RefObject<T | null>;
  /** Attach to the same element's `onKeyDown`. */
  onKeyDown: (event: JellyKeyEvent) => void;
}

/**
 * `const jelly = useJellyRadio<HTMLDivElement>(selectedIndex)` then
 * `<div role="radiogroup" ref={jelly.ref} onKeyDown={jelly.onKeyDown}>` (or `{...jelly}`) with the
 * chips as its direct `role="radio"` children. Replaces the Angular `[appJellyRadio]` directive.
 *
 * `selectedIndex` is the chosen chip's position, -1 for none. `options` (swell, barge, shrink,
 * jelly, bounce, stagger, stiffness) default to the original's constants and are read live, so
 * changing one needs no re-mount. Everything runs in effects, so SSR renders the plain group, and
 * every effect cleans up: the rAF loop is cancelled and both observers disconnected on unmount.
 */
export function useJellyRadio<T extends HTMLElement = HTMLDivElement>(
  selectedIndex: number,
  options: JellyRadioOptions = {},
): JellyRadio<T> {
  const ref = useRef<T>(null);
  const motion = useRef<JellyMotion | null>(null);
  const {
    swell = 0.2,
    barge = 6,
    shrink = 0.05,
    jelly = 1,
    bounce = 0.25,
    stagger = 22,
    stiffness = 580,
  } = options;
  const optionsRef = useRef<Options>({ swell, barge, shrink, jelly, bounce, stagger, stiffness });
  useEffect(() => {
    optionsRef.current = { swell, barge, shrink, jelly, bounce, stagger, stiffness };
  });

  // Create the motion and watch the group. Declared before the selection effect so that on mount
  // the motion exists by the time `follow` runs.
  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    const m = new JellyMotion(group, () => optionsRef.current);
    motion.current = m;
    const resize =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => m.remeasure());
    resize?.observe(group);
    const mutation =
      typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => m.refreshChips());
    mutation?.observe(group, { childList: true });
    return () => {
      resize?.disconnect();
      mutation?.disconnect();
      m.destroy();
      motion.current = null;
    };
  }, []);

  useEffect(() => {
    motion.current?.follow(selectedIndex);
  }, [selectedIndex]);

  return {
    ref,
    onKeyDown: (event) => motion.current?.onKeyDown(event),
  };
}
