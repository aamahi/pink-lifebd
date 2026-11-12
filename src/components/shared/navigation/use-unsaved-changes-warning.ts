'use client';

import { useCallback, useEffect, useRef } from 'react';

import { confirmDialogSync, type ConfirmDialogData } from './use-confirm-dialog';

/**
 * Both halves of what Angular split across two files, as one hook:
 *
 * - `pendingChangesGuard` (`canDeactivate` on the route) -- in-app navigation. App Router has no
 *   `canDeactivate`, so a capture-phase click listener on the document intercepts a click on any
 *   same-origin link BEFORE React's (and therefore `next/link`'s) handler sees it, asks, and cancels
 *   the click if the visitor says stay. It only asks when the form is actually dirty, so a clean
 *   form navigates away with no prompt at all.
 * - `appWarnOnUnsavedChanges` (`window:beforeunload`) -- a tab close, a refresh, or a navigation to
 *   a different origin, none of which go through the router. Setting `event.returnValue` triggers the
 *   browser's own native "leave site?" confirmation; a custom dialog cannot run here -- the browser
 *   does not wait for JS to open one before the tab closes.
 *
 * `isDirty` is a boolean (`form.isDirty`) or a zero-arg function; it is read through a ref at the
 * moment of the event, so a form that saves and then navigates (`setDirty(false)`, then `push`)
 * is not stopped by its own just-cleared state.
 *
 * Not covered, and the gap the router guard used to close: the browser's Back/Forward buttons
 * (`popstate`) and a programmatic `router.push()`. App Router cannot cancel a history traversal
 * once the browser has performed it. For a programmatic navigation (a Cancel button that is not a
 * link), call the returned `confirmLeave()` first.
 */
export type UnsavedChangesWarningOptions = Partial<ConfirmDialogData>;

const DEFAULT_PROMPT: ConfirmDialogData = {
  title: 'Unsaved changes',
  message: 'You have unsaved changes. Leave without saving?',
  confirmText: 'Leave',
};

export function useUnsavedChangesWarning(
  isDirty: boolean | (() => boolean),
  options?: UnsavedChangesWarningOptions,
): { confirmLeave: () => boolean } {
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const confirmLeave = useCallback((): boolean => {
    const dirty = dirtyRef.current;
    if (!(typeof dirty === 'function' ? dirty() : dirty)) return true;
    return confirmDialogSync({ ...DEFAULT_PROMPT, ...optionsRef.current });
  }, []);

  useEffect(() => {
    const isDirtyNow = (): boolean => {
      const dirty = dirtyRef.current;
      return typeof dirty === 'function' ? dirty() : dirty;
    };

    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (!isDirtyNow()) return;
      event.preventDefault();
      // Legacy requirement some browsers still honour; the string itself is never shown, but the
      // property must be set to something truthy, not just left alone.
      event.returnValue = true;
    };

    const onClick = (event: MouseEvent): void => {
      if (!isDirtyNow()) return;
      // A modified or non-primary click opens a new tab/window (or is not a navigation at all);
      // this tab's form is untouched, so there is nothing to lose.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href, window.location.href);
      // A different origin unloads the page, which `beforeunload` above already covers.
      if (url.origin !== window.location.origin) return;
      // The same page (an in-page `#fragment`, or a link to where the visitor already is).
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      if (!confirmLeave()) {
        // Capture phase on `document` runs before React's root listener, so stopping propagation
        // here keeps `next/link`'s onClick from ever starting the client navigation.
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [confirmLeave]);

  return { confirmLeave };
}
