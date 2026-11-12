'use client';

import { useCallback, useState } from 'react';
import { useToastStore, type Toast } from '@/core/stores/toast.store';
import { ToastCard } from './toast-card';

interface Row {
  readonly toast: Toast;
  readonly leaving: boolean;
}

/**
 * Folds the store's current queue into the rendered rows. A toast the store dropped is kept, marked
 * `leaving`, so its drop animation can play; `<ToastCard onExited>` removes it once it has. New
 * toasts append, so a leaving row keeps its place in the stack while it collapses.
 */
function reconcile(prev: readonly Row[], active: readonly Toast[]): readonly Row[] {
  const live = new Map(active.map((t) => [t.id, t]));
  const next: Row[] = prev.map((row) => {
    const toast = live.get(row.toast.id);
    if (toast) return { toast, leaving: false };
    return row.leaving ? row : { toast: row.toast, leaving: true };
  });
  const known = new Set(prev.map((row) => row.toast.id));
  for (const toast of active) {
    if (!known.has(toast.id)) next.push({ toast, leaving: false });
  }
  return next;
}

/**
 * `<ToastHost />` — mount once in the layout shell (`MainLayout`). Reads the toast store's
 * `activeToasts` and is the ONLY thing in the tree that does; see `toast.store.ts`'s header comment
 * for the measured failure that exists when nothing does.
 *
 * `aria-live="polite"` on the container, not `assertive` and not `role="alert"` on the toasts
 * themselves: a toast is a background confirmation ("Added to cart"), not an interruption, and
 * `alert.tsx` next door already reserves the assertive/interrupting treatment for that component's
 * `danger` tone. `aria-atomic="false"` so a screen reader announces only the toast that was just
 * added, not the whole stack re-read on every change.
 *
 * Every toast carries its own dismiss `<button>` — a native, natively focusable, natively
 * Enter/Space-activatable control, so keyboard operation costs nothing extra to implement or to
 * verify. The card itself (`toast-card.tsx`) owns the look, the fuse and the swipe.
 *
 * Enter and leave: the store removes a toast the moment it is dismissed, but a card must stay
 * mounted while its drop plays (the Angular `animate.leave` held the element the same way; a plain
 * list would delete it mid-air). `rows` is the store's queue plus any toast still leaving.
 */
export function ToastHost() {
  const activeToasts = useToastStore((s) => s.activeToasts);
  const [rows, setRows] = useState<readonly Row[]>(() => reconcile([], activeToasts));
  const [seen, setSeen] = useState(activeToasts);

  // Derive `rows` from the store during render (React's "adjusting state when a prop changes"
  // pattern), so a new toast mounts in the same commit rather than one effect later.
  if (seen !== activeToasts) {
    setSeen(activeToasts);
    setRows(reconcile(rows, activeToasts));
  }

  const exited = useCallback((id: number) => {
    setRows((current) => current.filter((row) => row.toast.id !== id));
  }, []);

  // Phones: full-width and centred, lifted over the bottom bar (md:hidden) so a toast is not drawn
  // behind it. From sm the stack sits bottom-right, 32px in as SwipeToast places itself; from md
  // the bar is gone, and 3.5rem clears the layout's fixture badge in that same corner. No `gap`:
  // each card carries its own top margin inside its collapsing row, so a leaving toast takes its
  // spacing with it.
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-bar-height)+0.75rem)] z-50 flex flex-col items-center px-4 sm:items-end sm:px-8 md:bottom-14"
      aria-live="polite"
      aria-atomic="false"
    >
      {rows.map((row) => (
        <ToastCard key={row.toast.id} toast={row.toast} leaving={row.leaving} onExited={exited} />
      ))}
    </div>
  );
}
