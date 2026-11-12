'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { useToastStore, type Toast } from '@/core/stores/toast.store';
import { cn } from '@/core/utils/cn';
import styles from './toast-card.module.css';

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
/** Release speed, px/ms, past which a downward drag dismisses however short it was. */
const FLICK = 0.11;
/** Movement before a press becomes a drag, so a click on the card stays a click. */
const DEAD_ZONE = 3;
/** Upward drags are resisted; this is the most they can ever travel. */
const RESIST_PX = 24;
/**
 * Backstop for `onExited`: the leave animation's `animationend` is the normal signal, but a
 * hidden tab can defer it, and a toast stuck in the leave state would sit in the stack for good.
 * The leave is 280ms (200ms when instant); this is comfortably past both.
 */
const EXIT_FALLBACK_MS = 700;

/** Rubber-band an overshoot `over` against a limit `dim` (the iOS scroll-edge curve). */
const rubberband = (over: number, dim: number, c = 0.55) =>
  (over * dim * c) / (dim + c * Math.abs(over));

interface Drag {
  id: number;
  startY: number;
  grab: number | null;
  moved: boolean;
  hist: [number, number][];
}

/** Everything the gesture and the fuse mutate between renders; none of it is render state. */
interface CardState {
  fuse: Animation | null;
  motion: Animation | null;
  flags: { hover: boolean; interacting: boolean; focus: boolean; hidden: boolean };
  lastInput: 'pointer' | 'keyboard';
  leaving: boolean;
  y: number;
  drag: Drag | null;
}

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface ToastCardProps {
  toast: Toast;
  /**
   * True once the toast has left the queue: the card plays its drop and collapses its row, then
   * calls `onExited`. `<ToastHost>` keeps a leaving toast mounted for exactly that long (the
   * Angular `animate.leave` did the same -- a plain list would delete it mid-air).
   */
  leaving?: boolean;
  onExited?: (id: number) => void;
}

/**
 * One toast: a light card that rises from the bottom, burns an amber fuse along
 * its bottom edge for as long as it has left, and drops away. Port of
 * React Bits' `SwipeToast`, with its timings and gesture thresholds unchanged;
 * `motion`'s springs are replaced with the Web Animations API, so it adds no
 * dependency.
 *
 * - **Timer.** The toast store still owns expiry. The fuse is only its picture:
 *   hover, focus, a drag in progress, or a hidden tab pause both together
 *   (`pause` / `resume`), so the line never lies about time left.
 * - **Swipe.** Drag down to dismiss -- past 40px, or any flick. Upward drags
 *   rubber-band to at most 24px. Let go early and it springs back with a little
 *   overshoot.
 * - **Rise and drop** are the `toastEnter` / `toastLeave` classes, styled in
 *   `toast-card.module.css`. Each also collapses the toast's own row
 *   (grid rows 1fr to 0fr), so the stack closes up smoothly instead of jumping.
 *   A swipe or Escape has already moved the card, so `data-instant` skips the
 *   drop and only the row collapses.
 *
 * The live region is the host's, not the card's: two nested polite regions
 * would read every toast twice.
 */
export function ToastCard({ toast, leaving = false, onExited }: ToastCardProps) {
  const pause = useToastStore((s) => s.pause);
  const resume = useToastStore((s) => s.resume);
  const dismiss = useToastStore((s) => s.dismiss);

  /** True when the exit must not replay the drop: a swipe already moved the card, or Escape. */
  const [instant, setInstant] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const fuseRef = useRef<HTMLElement>(null);
  const st = useRef<CardState>({
    fuse: null,
    motion: null,
    flags: { hover: false, interacting: false, focus: false, hidden: false },
    lastInput: 'pointer',
    leaving: false,
    y: 0,
    drag: null,
  });

  const { id, durationMs } = toast;

  /** Any reason to hold still pauses both the fuse and the store's clock. */
  const sync = useCallback((): void => {
    const s = st.current;
    if (s.leaving) return;
    const f = s.flags;
    const hold = f.hover || f.interacting || f.focus || f.hidden;
    if (hold) {
      s.fuse?.pause();
      pause(id);
    } else {
      if (s.fuse?.playState === 'paused') s.fuse.play();
      resume(id);
    }
  }, [id, pause, resume]);

  useEffect(() => {
    const s = st.current;
    const el = fuseRef.current;
    // jsdom has no Element.animate.
    if (el && typeof el.animate === 'function') {
      s.fuse = el.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
        duration: durationMs,
        easing: 'linear',
        fill: 'forwards',
      });
      s.flags.hidden = document.hidden;
      sync();
    }
    return () => {
      s.fuse?.cancel();
      s.fuse = null;
      s.motion?.cancel();
      s.motion = null;
    };
  }, [durationMs, sync]);

  useEffect(() => {
    const onVisibility = () => {
      st.current.flags.hidden = document.hidden;
      sync();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [sync]);

  useEffect(() => {
    if (!leaving || !onExited) return;
    const timer = setTimeout(() => onExited(id), EXIT_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [leaving, onExited, id]);

  const setFlag = (flag: 'hover' | 'focus', on: boolean): void => {
    st.current.flags[flag] = on;
    sync();
  };

  const onHover = (event: PointerEvent<HTMLDivElement>, on: boolean): void => {
    if (event.pointerType === 'mouse') setFlag('hover', on);
  };

  const onFocusOut = (event: FocusEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFlag('focus', false);
    }
  };

  /** Escape, or the close button pressed from the keyboard, leaves at once: no drop to sit through. */
  const close = (why: 'close' | 'escape'): void => {
    const s = st.current;
    if (s.leaving) return;
    s.leaving = true;
    setInstant(why === 'escape' || s.lastInput === 'keyboard');
    dismiss(id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') st.current.lastInput = 'keyboard';
    if (event.key === 'Escape') {
      event.stopPropagation();
      close('escape');
    }
  };

  const place = (y: number): void => {
    st.current.y = y;
    const card = cardRef.current;
    if (card) card.style.transform = y ? `translateY(${y}px)` : '';
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const s = st.current;
    s.lastInput = 'pointer';
    const target = event.target as Element;
    if (event.button !== 0 || s.drag || s.leaving || target.closest('button')) return;
    const card = event.currentTarget;
    try {
      card.setPointerCapture(event.pointerId);
    } catch {
      // Capture can fail on a pointer the browser already released; the drag still works.
    }
    // Grabbing a card mid-settle freezes it where it is.
    if (s.motion) {
      place(new DOMMatrix(getComputedStyle(card).transform).m42);
      s.motion.cancel();
      s.motion = null;
    }
    s.drag = {
      id: event.pointerId,
      startY: event.clientY,
      grab: null,
      moved: false,
      hist: [[performance.now(), s.y]],
    };
    s.flags.interacting = true;
    sync();
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const s = st.current;
    const d = s.drag;
    if (!d || d.id !== event.pointerId) return;
    if (d.grab === null) {
      if (Math.abs(event.clientY - d.startY) < DEAD_ZONE) return;
      d.grab = event.clientY - s.y;
      event.currentTarget.dataset['swiping'] = '';
    }
    const raw = event.clientY - d.grab;
    place(raw >= 0 ? raw : rubberband(raw, RESIST_PX));
    d.moved = true;
    d.hist.push([performance.now(), s.y]);
    if (d.hist.length > 4) d.hist.shift();
  };

  /** px/ms over the last few samples; a pointer that stopped for 100ms has none. */
  const velocity = (hist: [number, number][]): number => {
    const first = hist[0];
    const last = hist.at(-1);
    if (!first || !last || hist.length < 2) return 0;
    if (performance.now() - last[0] > 100) return 0;
    return (last[1] - first[1]) / Math.max(1, last[0] - first[0]);
  };

  /** Spring home. The overshooting curve stands in for the original's 0.2-bounce spring. */
  const settle = (from: number): void => {
    const s = st.current;
    const card = cardRef.current;
    if (!card) return;
    place(0);
    if (typeof card.animate !== 'function') return;
    const motion = card.animate(
      [{ transform: `translateY(${from}px)` }, { transform: 'translateY(0)' }],
      prefersReducedMotion()
        ? { duration: 200, easing: EASE_OUT }
        : { duration: 500, easing: 'cubic-bezier(0.34, 1.36, 0.64, 1)' },
    );
    motion.onfinish = () => {
      s.motion = null;
    };
    s.motion = motion;
  };

  /** Carry on down past the card's own height while fading, then leave without the drop. */
  const swipeOut = (dy: number): void => {
    const s = st.current;
    s.leaving = true;
    s.fuse?.pause();
    pause(id);
    const card = cardRef.current;
    const done = () => {
      setInstant(true);
      dismiss(id);
    };
    if (!card || typeof card.animate !== 'function') {
      done();
      return;
    }
    const reduced = prefersReducedMotion();
    const to = reduced ? dy : dy + card.offsetHeight;
    card.animate(
      [
        { transform: `translateY(${dy}px)`, opacity: 1 },
        { transform: `translateY(${to}px)`, opacity: 0 },
      ],
      { duration: reduced ? 200 : 300, easing: EASE_OUT, fill: 'forwards' },
    ).onfinish = done;
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    const s = st.current;
    const d = s.drag;
    if (!d || d.id !== event.pointerId) return;
    s.drag = null;
    const card = event.currentTarget;
    delete card.dataset['swiping'];
    try {
      card.releasePointerCapture(event.pointerId);
    } catch {
      // Already released.
    }
    s.flags.interacting = false;
    const dy = s.y;
    const v = velocity(d.hist);
    if (dy > 0 && (v > FLICK || (dy >= 40 && v >= 0))) {
      swipeOut(dy);
      return;
    }
    if (d.moved && dy !== 0) settle(dy);
    sync();
  };

  // The root's own leave animation is the row collapsing; the `.lift` child's drop bubbles an
  // `animationend` of its own, which must not be mistaken for it.
  const onAnimationEnd = (event: AnimationEvent<HTMLDivElement>): void => {
    if (event.target !== event.currentTarget) return;
    if (leaving && event.animationName.includes('st-rows-close')) onExited?.(id);
  };

  return (
    <div
      className={cn(styles['root'], leaving ? styles['toastLeave'] : styles['toastEnter'])}
      data-instant={instant ? '' : undefined}
      data-tone={toast.tone}
      onAnimationEnd={onAnimationEnd}
    >
      <div className={styles['gate']}>
        <div className={styles['lift']}>
          <div
            ref={cardRef}
            className={styles['card']}
            tabIndex={0}
            role="group"
            aria-label={toast.message}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerEnter={(event) => onHover(event, true)}
            onPointerLeave={(event) => onHover(event, false)}
            onFocus={() => setFlag('focus', true)}
            onBlur={onFocusOut}
            onKeyDown={onKeyDown}
          >
            <span className={styles['icon']} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {toast.tone === 'success' ? (
                  <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="m8 12.5 2.8 2.8L16.5 9.5" />
                  </>
                ) : toast.tone === 'warning' ? (
                  <>
                    <path d="M12 3.5 2.5 20h19z" />
                    <path d="M12 10v4.5M12 17.2v.1" />
                  </>
                ) : toast.tone === 'danger' ? (
                  <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="m9 9 6 6m0-6-6 6" />
                  </>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5.5M12 7.8v.1" />
                  </>
                )}
              </svg>
            </span>
            <span className={styles['body']}>
              <p className={styles['title']}>{toast.message}</p>
            </span>
            <button
              type="button"
              className={styles['close']}
              aria-label="Dismiss notification"
              onClick={() => close('close')}
            >
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <i ref={fuseRef} className={styles['fuse']} aria-hidden="true"></i>
          </div>
        </div>
      </div>
    </div>
  );
}
