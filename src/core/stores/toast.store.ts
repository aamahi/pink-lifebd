'use client';

import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
  readonly durationMs: number;
}

export interface ShowToastOptions {
  readonly tone?: ToastTone;
  /** Auto-dismiss delay in ms. */
  readonly durationMs?: number;
}

const DEFAULT_DURATION_MS = 5000;

/**
 * Toast queue (port of the Angular `ToastService`): `show()` pushes, `activeToasts` is what the
 * mounted `<ToastHost />` reads, `dismiss()` (manual or timer-driven) removes.
 *
 * The shape answers a measured failure in the source storefront: `show()` was called 25 times and no
 * template anywhere rendered the queue, so every toast went into state nothing displayed. Nothing
 * threw. That is why `<ToastHost />` is MOUNTED once in `MainLayout`, not merely built.
 *
 * Expiry timers are browser-only. They live in module-level maps (not in store state) because a
 * timer handle is not render state. `pause`/`resume` keep the time a toast had left, so a toast
 * someone is reading or holding does not close under them.
 */
interface ToastState {
  readonly activeToasts: readonly Toast[];
  /** Queues a toast and returns its id, which `dismiss()` accepts. */
  show: (message: string, options?: ShowToastOptions) => number;
  /** Stops a toast's expiry clock, keeping the time it had left. */
  pause: (id: number) => void;
  /** Restarts a paused clock with the time it had left. A running or unknown id is ignored. */
  resume: (id: number) => void;
  /** Removes a toast immediately. */
  dismiss: (id: number) => void;
}

let nextId = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();
/** When each running timer fires, and how long a paused one had left. */
const deadlines = new Map<number, number>();
const remaining = new Map<number, number>();

const isBrowser = () => typeof window !== 'undefined';

export const useToastStore = create<ToastState>((set, get) => {
  const arm = (id: number, ms: number): void => {
    timers.set(
      id,
      setTimeout(() => get().dismiss(id), ms),
    );
    deadlines.set(id, Date.now() + ms);
    remaining.delete(id);
  };

  return {
    activeToasts: [],

    show: (message, options = {}) => {
      const id = nextId++;
      const toast: Toast = {
        id,
        message,
        tone: options.tone ?? 'info',
        durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
      };
      set((s) => ({ activeToasts: [...s.activeToasts, toast] }));
      if (isBrowser()) arm(id, toast.durationMs);
      return id;
    },

    pause: (id) => {
      const timer = timers.get(id);
      const deadline = deadlines.get(id);
      if (timer === undefined || deadline === undefined) return;
      clearTimeout(timer);
      timers.delete(id);
      deadlines.delete(id);
      remaining.set(id, Math.max(0, deadline - Date.now()));
    },

    resume: (id) => {
      const left = remaining.get(id);
      if (left === undefined || !isBrowser()) return;
      arm(id, left);
    },

    dismiss: (id) => {
      const timer = timers.get(id);
      if (timer !== undefined) {
        clearTimeout(timer);
        timers.delete(id);
      }
      deadlines.delete(id);
      remaining.delete(id);
      set((s) => ({ activeToasts: s.activeToasts.filter((t) => t.id !== id) }));
    },
  };
});

/**
 * `const toast = useToast(); toast.show('Added to cart', { tone: 'success' })`.
 * Stable function references, so it is safe in effect dependency lists. Outside React (an event
 * handler in a plain module) call `useToastStore.getState().show(...)`.
 */
export function useToast() {
  const activeToasts = useToastStore((s) => s.activeToasts);
  const show = useToastStore((s) => s.show);
  const pause = useToastStore((s) => s.pause);
  const resume = useToastStore((s) => s.resume);
  const dismiss = useToastStore((s) => s.dismiss);
  return { activeToasts, show, pause, resume, dismiss };
}
