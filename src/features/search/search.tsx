'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { listCategories, looksUnfiltered, searchProducts, usingFixtures } from '@/core/data/catalog.api';
import type { Product } from '@/core/data/catalog.model';
import { useAsync } from '@/core/hooks/use-async';
import { cn } from '@/core/utils/cn';
import {
  stringField,
  useRouteViewState,
  type RouteViewStateFields,
} from '@/components/shared/navigation/use-route-view-state';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/features/catalog/sections/product-card/product-card';

type SearchViewState = { q: string };

const FIELDS: RouteViewStateFields<SearchViewState> = { q: stringField('') };

const CHIP =
  'inline-flex h-11 items-center rounded-full border border-(--color-rail-border) px-5 text-sm font-medium text-(--color-rail-fg) outline-none transition-colors hover:border-(--color-rail-fg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)';

const SKELETONS = [0, 1, 2, 3];

/** Keystrokes: wait for a pause this long before asking. */
const DEBOUNCE_MS = 300;

const NO_PRODUCTS: readonly Product[] = [];

/**
 * Search, at `/search` -- what the header's magnifier opens.
 *
 * Built for a thumb. The field is 56px tall at 16px text (anything smaller makes iOS zoom the
 * page on focus), takes focus when the page opens empty so the keyboard is already up, and its
 * keyboard key reads "Search". Results appear as the visitor types, so nothing has to be
 * submitted; Enter just closes the keyboard so the results are not hidden behind it.
 *
 * Results are the shop's own `<ProductCard>` in the shop's own grid, so a hit looks like
 * the product it is (photo, price, quick add) rather than a row of text.
 *
 * `q` is held in the URL by `useRouteViewState`, so a refresh and a Back from a product land on the
 * same search. The URL follows every keystroke (`replaceState`, no history spam); the request only
 * follows a pause.
 *
 * Two behaviours worth knowing about:
 * - A new request cancels the one before it. Without that a slow answer to "br" can
 *   land after the answer to "bra" and the page shows results for a term nobody is looking at.
 *   (The Angular page did it with `switchMap`; here each started request takes a number and an
 *   answer that is no longer the latest number is dropped.)
 * - While a new search runs, the last results stay on screen, dimmed, and the first search shows
 *   the skeleton. Swapping the grid for a skeleton on every pause flashes the whole page once per
 *   word.
 */
export function Search() {
  const boxRef = useRef<HTMLInputElement>(null);

  /** List-state (just `q` here), held in the URL -- see the component doc. */
  const view = useRouteViewState<SearchViewState>(FIELDS);
  const query = view.state.q;
  /**
   * The box's current text, for the debounced request to check against. A ref, because the timer
   * outlives the render that started it and `view.snapshot()` there is that render's state.
   */
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const [results, setResults] = useState<readonly Product[]>(NO_PRODUCTS);
  /** The term `results` answers. `query` runs ahead of it while the visitor is typing. */
  const [lastTerm, setLastTerm] = useState('');
  // A search restored from the URL starts out loading, so the first paint is the skeleton rather
  // than a flash of "Type a product name" over a request that is about to start.
  const [loading, setLoading] = useState(() => query.trim() !== '');
  const [error, setError] = useState<string | null>(null);

  /** The term whose request was last started, so an unchanged term is not asked twice. */
  const requested = useRef<string | null>(null);
  /** Numbers each started request; only the latest one's answer is applied. */
  const latest = useRef(0);
  /** The pending keystroke timer. */
  const pause = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /**
   * Secondary content: quick links, not the answer to the search. If this request fails the links
   * are simply absent and the search above still works, so it has no loading or error branch of
   * its own -- the four states are the search's.
   */
  const categoriesRequest = useAsync(() => listCategories(), []);
  const categories = categoriesRequest.status === 'ready' ? categoriesRequest.data : [];

  /** First search of the visit: nothing to keep on screen, so show the skeleton. */
  const searching = loading && results.length === 0;

  /** The category links sit where a search has nothing to show: before one, and after a miss. */
  const showCategories =
    categories.length > 0 &&
    error === null &&
    (query.trim() === '' || (!loading && results.length === 0));

  const unfiltered = !usingFixtures && looksUnfiltered(lastTerm, results);

  const fetchTerm = (raw: string): void => {
    const term = raw.trim();
    if (term === '') {
      latest.current++;
      requested.current = null;
      setResults(NO_PRODUCTS);
      setLastTerm('');
      setLoading(false);
      setError(null);
      return;
    }
    if (term === requested.current) {
      // Typed away and back inside the pause: the grid already answers this term.
      setLoading(false);
      return;
    }
    requested.current = term;
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    searchProducts(term).then(
      (products) => {
        if (id !== latest.current) return;
        setResults(products);
        setLastTerm(term);
        setLoading(false);
      },
      // Caught per request, so one failed request does not stop every later keystroke being heard.
      (err: unknown) => {
        if (id !== latest.current) return;
        setError(err instanceof Error ? err.message : 'Request failed.');
        setLoading(false);
      },
    );
  };

  useEffect(() => {
    // A search restored from the URL (refresh, Back, a shared link) runs once, now.
    const seeded = view.snapshot().q;
    if (seeded.trim() !== '') {
      fetchTerm(seeded);
    } else {
      // Opened empty: the visitor came to type, so put the cursor there.
      boxRef.current?.focus();
    }
    return () => {
      // Leaving the page (or React's dev-only remount): drop any answer still on its way and
      // forget what was asked, so the remount's own request is not mistaken for a repeat.
      latest.current++;
      requested.current = null;
      clearTimeout(pause.current);
    };
    // Runs once per mount, on the URL the page opened with. `fetchTerm` reads only refs and
    // state setters, so the copy from the render this effect closed over is as good as any later one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onInput = (value: string): void => {
    view.patch({ q: value });
    if (value.trim() === '') {
      fetchTerm('');
      return;
    }
    // Show that something is happening during the pause, not only once the request starts.
    setLoading(true);
    clearTimeout(pause.current);
    pause.current = setTimeout(() => {
      // Drop a keystroke's request if the box no longer holds that text -- Clear pressed inside
      // the pause, say -- or the late request would resurrect results for a term that was erased.
      if (value === queryRef.current) fetchTerm(value);
    }, DEBOUNCE_MS);
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    boxRef.current?.blur();
    const term = query;
    if (term.trim() !== '') setLoading(true);
    fetchTerm(term);
  };

  const clear = (): void => {
    view.patch({ q: '' });
    fetchTerm('');
    boxRef.current?.focus();
  };

  const retry = (): void => {
    requested.current = null;
    setLoading(true);
    fetchTerm(query);
  };

  return (
    <div className="min-h-[60vh] bg-(--color-rail-bg) font-jakarta text-(--color-rail-fg)">
      <section
        aria-labelledby="search-title"
        className="mx-auto w-full max-w-[1320px] px-4 py-6 lg:px-20 lg:py-10"
      >
        <h1 id="search-title" className="font-display text-3xl font-semibold lg:text-4xl">
          Search
        </h1>

        <form role="search" className="mt-5 max-w-2xl" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="search-input">
            Search products
          </label>
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-(--color-rail-muted)"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4.2-4.2" />
            </svg>
            <input
              ref={boxRef}
              id="search-input"
              type="search"
              name="q"
              placeholder="Search products"
              enterKeyHint="search"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={query}
              onChange={(event) => onInput(event.target.value)}
              className="h-14 w-full appearance-none rounded-xl border border-(--color-rail-border) bg-(--color-rail-bg) pl-12 pr-14 text-base text-(--color-rail-fg) outline-none transition-colors placeholder:text-(--color-rail-muted)/70 focus:border-(--color-rail-fg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />
            {query !== '' && (
              <button
                type="button"
                className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-(--color-rail-muted) outline-none transition-colors hover:bg-(--color-shop-tile) hover:text-(--color-rail-fg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
                aria-label="Clear search"
                onClick={clear}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {error ? (
          <ErrorState className="mt-8 block" title="Search failed" message={error} onRetry={retry} />
        ) : query.trim() === '' ? (
          <p className="mt-8 text-sm text-(--color-rail-muted)">
            Type a product name above and matches appear as you go.
          </p>
        ) : searching ? (
          <>
            <div
              className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4"
              aria-busy="true"
            >
              {SKELETONS.map((i) => (
                <div key={i}>
                  <div className="aspect-[4/5] animate-pulse rounded-xl bg-(--color-shop-tile)"></div>
                  <Skeleton className="mt-3 block" count={2} height="0.9rem" />
                </div>
              ))}
            </div>
            <p className="sr-only" role="status">
              Searching
            </p>
          </>
        ) : results.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-(--color-shop-tile) py-6">
            <EmptyState
              title={'No results for “' + lastTerm + '”'}
              hint="Check the spelling, try a shorter word, or browse everything."
            >
              <Button variant="dark" size="lg" href="/shop">
                Browse the shop
              </Button>
            </EmptyState>
          </div>
        ) : (
          <>
            <p className="mt-8 text-sm text-(--color-rail-muted)" role="status">
              {results.length} {results.length === 1 ? 'result' : 'results'} for “{lastTerm}”
            </p>
            {unfiltered && (
              <Alert className="mt-4 block" tone="warning" title="Search may not be applied">
                The server returned products that do not mention your search. It may be ignoring the
                search term, so the products below are shown unchanged.
              </Alert>
            )}
            <ul
              className={cn(
                'mt-4 grid grid-cols-2 gap-x-5 gap-y-8 transition-opacity md:grid-cols-3 lg:grid-cols-4',
                loading && 'opacity-50',
              )}
              aria-busy={loading ? 'true' : undefined}
            >
              {results.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} priority={i < 4} />
                </li>
              ))}
            </ul>
          </>
        )}

        {showCategories && (
          <nav className="mt-10" aria-labelledby="browse-title">
            <h2 id="browse-title" className="text-sm font-medium">
              Browse by category
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              <li>
                <Link href="/shop" className={CHIP}>
                  All products
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/shop?category=${encodeURIComponent(c.slug)}`} className={CHIP}>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </section>
    </div>
  );
}
