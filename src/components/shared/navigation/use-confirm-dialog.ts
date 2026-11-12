'use client';

import { useCallback } from 'react';

/**
 * Part of the navigation contract (ecom-fullstack#82), added here rather than ported: admin's
 * `pending-changes.guard.ts` opens its own `ConfirmDialogService`, which wraps `MatDialog` and a
 * styled `ConfirmDialogComponent`. This template ships no dialog/modal primitive at all, and
 * `CONTRIBUTING.md`'s bar -- a primitive earns its place only once at least two pages need it --
 * argues against building a full styled modal for this one caller. So the implementation underneath
 * is the browser's own `window.confirm` -- blocking, unstyled, and honest about what it is rather
 * than a hand-rolled imitation of a modal. A fork that adds a real dialog only has to rewrite this
 * one file.
 *
 * That is why there is no `<ConfirmDialog />` host to mount: nothing here renders. Blocking is also
 * load-bearing for `useUnsavedChangesWarning`, which must decide synchronously, inside a click
 * handler, whether to cancel the navigation.
 */
export interface ConfirmDialogData {
  readonly title: string;
  readonly message: string;
  readonly confirmText?: string;
  readonly cancelText?: string;
}

/**
 * Asks synchronously. `window.confirm` has no button labels, so `confirmText` / `cancelText` are
 * accepted for API parity with a future styled dialog and are not shown. Returns `true` when there
 * is no `window` (a server render): there is nobody to ask, and refusing would trap the caller.
 */
export function confirmDialogSync(data: ConfirmDialogData): boolean {
  if (typeof window === 'undefined') return true;
  return window.confirm(`${data.title}\n\n${data.message}`);
}

/** Same question, async -- the shape of the Angular `confirm(data): Observable<boolean>`. */
export function confirmDialog(data: ConfirmDialogData): Promise<boolean> {
  return Promise.resolve(confirmDialogSync(data));
}

/** `const { confirm } = useConfirmDialog(); if (await confirm({ title, message })) ...` */
export function useConfirmDialog(): {
  confirm: (data: ConfirmDialogData) => Promise<boolean>;
  confirmSync: (data: ConfirmDialogData) => boolean;
} {
  return {
    confirm: useCallback((data) => confirmDialog(data), []),
    confirmSync: useCallback((data) => confirmDialogSync(data), []),
  };
}
