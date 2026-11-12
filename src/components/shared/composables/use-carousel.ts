'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * `useCarousel({ slideCount: slides.length })`.
 *
 * This is the hook the ticket asks for; it is deliberately NOT a component. The consuming
 * component owns the markup, including the pause control the ticket names as non-negotiable --
 * see the WCAG note below. Wiring the autoplay timer here rather than in the caller keeps that
 * timer's lifecycle in one place.
 *
 * SSR-safe by construction: the interval is armed in an effect, which never runs on the server, and
 * the effect's cleanup clears it on unmount. Armed any earlier (during render), an SSR pass would
 * start a `setInterval` that outlives the request -- there is no browser tab for it to advance a
 * slide in.
 *
 * The ticket names the mistake this hook exists to make impossible: a hero carousel
 * autoplaying on a 6.5s interval with no way to stop it, which fails WCAG 2.2.2 (Pause, Stop,
 * Hide) outright. `paused` and `pause()`/`play()` are the escape hatch -- a caller MUST wire them
 * to a visible control, because this hook renders nothing and cannot enforce that on its own.
 */
export interface UseCarouselOptions {
  /**
   * The current slide count. A plain number is re-read every render; a function is read live each
   * tick, so a count that changes after mount is honoured either way.
   */
  readonly slideCount: number | (() => number);
  /** Default matches the interval named in the ticket's own WCAG example. */
  readonly intervalMs?: number;
  /** Starts playing immediately once mounted in the browser. Default `true`. */
  readonly autoplay?: boolean;
}

export interface CarouselControls {
  readonly index: number;
  readonly paused: boolean;
  next(): void;
  prev(): void;
  goTo(target: number): void;
  pause(): void;
  play(): void;
}

const wrap = (n: number, total: number): number => ((n % total) + total) % total;

export function useCarousel(options: UseCarouselOptions): CarouselControls {
  const { intervalMs = 6500, autoplay = true } = options;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(!autoplay);

  // The tick and the controls read the latest slide count and pause flag through refs, so the
  // interval is created once per mount (its phase is not reset by a pause/play or a re-render).
  const slideCountRef = useRef(options.slideCount);
  slideCountRef.current = options.slideCount;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const count = useCallback((): number => {
    const n = slideCountRef.current;
    return Math.max(1, typeof n === 'function' ? n() : n);
  }, []);

  const next = useCallback(() => setIndex((i) => wrap(i + 1, count())), [count]);
  const prev = useCallback(() => setIndex((i) => wrap(i - 1, count())), [count]);
  const goTo = useCallback((target: number) => setIndex(wrap(target, count())), [count]);
  const pause = useCallback(() => setPaused(true), []);
  const play = useCallback(() => setPaused(false), []);

  useEffect(() => {
    // Always armed, ticking only while not paused. The Angular version armed the timer only when
    // `autoplay` was true, so `autoplay: false` followed by `play()` set the flag and nothing ever
    // advanced; arming unconditionally makes `play()` work in both cases.
    const timer = setInterval(() => {
      if (!pausedRef.current) setIndex((i) => wrap(i + 1, count()));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, count]);

  return { index, paused, next, prev, goTo, pause, play };
}
