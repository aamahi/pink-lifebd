'use client';

import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

/**
 * The three states a request can be in. "Empty" is NOT one of them: an empty result is a LOADED
 * result (`status === 'ready'` with an empty array) that the view renders as its own fourth branch.
 *
 * Every data-driven view gives each of loading / error / empty / ready its own branch and never lets
 * one stand in for another -- collapsing "failed" into "empty" tells a user their filter matched
 * nothing when the API is down.
 */
export type AsyncState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: string }
  | { readonly status: 'ready'; readonly data: T };

export type AsyncResult<T> = AsyncState<T> & {
  /** Re-runs the request (the "Try again" button). Goes back to `loading` first. */
  readonly reload: () => void;
};

/**
 * Runs `load` on mount and whenever `deps` change; the replacement for `toSignal(obs$)` /
 * `resource()` in the Angular app.
 *
 * A response for a superseded request is dropped, so a slow first response cannot overwrite a faster
 * second one (a filter changed mid-flight). A rejection becomes `{ status: 'error', error }` -- it is
 * never swallowed and never turned into an empty list.
 */
export function useAsync<T>(load: () => Promise<T>, deps: DependencyList): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loadRef.current().then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data });
      },
      (err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            error: err instanceof Error ? err.message : 'Request failed.',
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
