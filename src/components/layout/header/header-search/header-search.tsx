'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@/components/shared/icons/icon';

/**
 * Header search box.
 *
 * Submits to `/shop?q=<term>` rather than owning a service of its own. The catalogue page
 * (`features/catalog/catalog.tsx`) reads its own `q` field from `useRouteViewState`, which restores
 * it from the `q` query parameter this form navigates to -- so this control's only job is to put
 * the term in the URL. There is nothing here to keep in sync with the catalogue's own filtering,
 * because the catalogue reads the same URL this writes.
 *
 * `query` below is not list-view state of this component's own -- this widget renders no list and
 * holds nothing that a refresh could lose; it is a one-shot forwarding box whose value is handed to
 * `router.push` toward a different page's URL.
 */
export function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/shop?${new URLSearchParams({ q }).toString()}` : '/shop');
  };

  return (
    <form className="relative hidden md:block" onSubmit={submit}>
      <label className="sr-only" htmlFor="header-search">
        Search products
      </label>
      <Icon
        name="search"
        size={16}
        className="pointer-events-none absolute left-2.5 top-1/2 -mt-2 text-[--color-text-muted]"
      />
      <input
        id="header-search"
        type="search"
        name="q"
        placeholder="Search products"
        className="h-9 w-48 rounded-md border border-[--color-border] bg-[--color-surface] pl-8 pr-3 text-sm focus:outline focus:outline-2 focus:outline-primary lg:w-64"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </form>
  );
}
