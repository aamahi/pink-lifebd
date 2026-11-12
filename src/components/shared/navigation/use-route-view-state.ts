'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { replaceQuery } from './route-navigate-serializer.util';

/**
 * One field of view state kept in the address bar. `parse` reads the raw
 * query-param string back into `T` and returns `undefined` when it is
 * absent/invalid (falls back to `defaultValue`); `serialize` turns the
 * current value back into a query-param string, or `null` to omit the param
 * entirely (e.g. when the value equals its default and the field opts into
 * not cluttering the URL with defaults).
 */
export interface RouteViewStateField<T> {
  defaultValue: T;
  parse(raw: string | null): T | undefined;
  serialize(value: T): string | null;
}

export type RouteViewStateFields<S> = { [K in keyof S]: RouteViewStateField<S[K]> };

export interface RouteViewState<S extends Record<string, unknown>> {
  /** Every field's current value. A new object only when some value actually changed. */
  readonly state: S;
  /**
   * One field's CURRENT value, so a ported `controller.get('q')()` reads `view.get('q')`. Live, not
   * the render's: read from a timer or an async callback it still sees a `patch()` made since.
   */
  get<K extends keyof S>(key: K): S[K];
  /** The whole current state, live like `get` (the Angular `controller.snapshot()`). */
  snapshot(): S;
  /**
   * Updates one or more fields and mirrors the result to the URL in a single `replaceState`. Every
   * field is re-serialized (a `null` from `serialize` removes its param); params this hook does not
   * own are left alone. Stable identity across renders.
   */
  patch(partial: Partial<S>): void;
}

/**
 * A list or detail page's filter/tab/paging state belongs in the address bar, not only in a local
 * `useState` -- a local-only value loses itself on refresh, and a Back navigation from a detail
 * page lands on a list that has forgotten what the visitor had filtered for.
 *
 * Port of `RouteViewStateController`. A page that needs its state to survive a refresh or a Back
 * navigation calls this ONCE with its fields: it restores each from the query string on mount, and
 * follows the URL after that (for links that change only the query -- see below), and mirrors every
 * write back to the URL through {@link RouteViewState.patch}.
 *
 * **Define `fields` at module scope** (`const FIELDS = { q: stringField('') }`). It is read through a
 * ref, so an inline object works, but a module constant makes the shape of the page's URL visible
 * at a glance.
 *
 * **The calling component must sit under a `<Suspense>` boundary in `page.tsx`** -- this hook calls
 * `useSearchParams()`, and `next build` rejects a statically prerendered page where nothing above
 * it can be client-rendered.
 *
 * Follow-the-URL: a link elsewhere on the page that changes only the query -- the header's Bras /
 * Panties entries, which all point at `/shop?collection=...` -- reuses this page's component, so a
 * hook that read the URL once would keep showing the previous collection. Measured on the Angular
 * /shop: clicking Woman while on Man changed the address bar and left the Man products on screen.
 * Every field is re-read when the URL changes; one absent from the URL falls back to its default.
 *
 * Local state first, URL second: a write updates React state immediately and the URL right after,
 * so a controlled input never waits on the address bar. The URL changes this page itself caused
 * come back through `useSearchParams()` as the values just set, and are ignored; so is an
 * intermediate URL from an earlier write that lands after a newer one (typing "ab" fast can commit
 * "a" last, and adopting it would snap the input back a character).
 */
export function useRouteViewState<S extends Record<string, unknown>>(
  fields: RouteViewStateFields<S>,
): RouteViewState<S> {
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const urlKey = useSearchParams().toString();

  const [state, setState] = useState<S>(() => parseAll(fields, new URLSearchParams(urlKey)));
  // The latest state, readable synchronously: two `patch()` calls in one event handler must see each
  // other (`setState`'s value is not visible until the next render).
  const stateRef = useRef(state);
  stateRef.current = state;

  /** Search strings this hook wrote that the URL has not reported back yet; `lastWritten` is the newest. */
  const written = useRef<Set<string>>(new Set());
  const lastWritten = useRef<string | null>(null);

  useEffect(() => {
    const pending = written.current;
    if (pending.size > 0) {
      // An older write of ours landing after a newer one was made: local state is already ahead of
      // it, and adopting it would snap a controlled input back a keystroke.
      if (pending.has(urlKey) && urlKey !== lastWritten.current) return;
      // Either our newest write coming back (re-parsing it below is a no-op, and normalizes a value
      // `parse` would not accept as written) or a URL we did not write -- an external navigation,
      // which also voids any write still in flight.
      pending.clear();
    }
    const parsed = parseAll(fieldsRef.current, new URLSearchParams(urlKey));
    // Keep the old object when nothing differs, so an unrelated URL change does not re-render.
    setState((prev) =>
      (Object.keys(parsed) as (keyof S)[]).every((key) => Object.is(prev[key], parsed[key]))
        ? prev
        : parsed,
    );
  }, [urlKey]);

  const patch = useCallback((partial: Partial<S>) => {
    const next = { ...stateRef.current, ...partial } as S;
    stateRef.current = next;
    setState(next);

    const updates: Record<string, string | null> = {};
    for (const key of Object.keys(fieldsRef.current) as (keyof S)[]) {
      updates[String(key)] = fieldsRef.current[key].serialize(next[key]);
    }
    const search = replaceQuery(updates);
    written.current.add(search);
    lastWritten.current = search;
  }, []);

  return useMemo(
    () => ({
      state,
      get: (key) => stateRef.current[key],
      snapshot: () => stateRef.current,
      patch,
    }),
    [state, patch],
  );
}

function parseAll<S extends Record<string, unknown>>(
  fields: RouteViewStateFields<S>,
  params: URLSearchParams,
): S {
  const out = {} as S;
  for (const key of Object.keys(fields) as (keyof S)[]) {
    const field = fields[key];
    const parsed = field.parse(params.get(String(key)));
    out[key] = parsed !== undefined ? parsed : field.defaultValue;
  }
  return out;
}

/** A required string field -- every non-empty raw value is valid, empty/absent falls back to `defaultValue`. */
export function stringField(defaultValue: string): RouteViewStateField<string> {
  return {
    defaultValue,
    parse: (raw) => (raw ? raw : undefined),
    serialize: (value) => (value ? value : null),
  };
}

/** An integer field, validated against `isValid` (default: any positive integer -- the common page-number case). */
export function numberField(
  defaultValue: number,
  isValid: (n: number) => boolean = (n) => Number.isInteger(n) && n >= 1,
): RouteViewStateField<number> {
  return {
    defaultValue,
    parse: (raw) => {
      const n = Number(raw);
      return raw !== null && isValid(n) ? n : undefined;
    },
    serialize: (value) => String(value),
  };
}

/** A closed-set field (a tab key, a sort key, ...) -- anything outside `allowed` falls back to `defaultValue`. */
export function enumField<T extends string>(
  defaultValue: T,
  allowed: readonly T[],
): RouteViewStateField<T> {
  return {
    defaultValue,
    parse: (raw) => (raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined),
    serialize: (value) => value,
  };
}
