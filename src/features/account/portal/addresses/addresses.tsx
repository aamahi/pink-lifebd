'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { sleep } from '@/core/data/catalog.api';
import { useAsync } from '@/core/hooks/use-async';

export interface Address {
  readonly id: string;
  readonly label: string;
  readonly line: string;
}

/**
 * Saved addresses -- the smallest of the portal's async pages, kept
 * self-contained rather than backed by a dedicated store: there is no
 * `Address` type or endpoint anywhere else in this template for a store to
 * wrap, and inventing one just to match the catalogue's shape for a single
 * caller would be the "ship thin" instruction working against itself.
 *
 * The load resolves `[]` after a short delay rather than reading a fixture
 * constant -- the demo starts with zero saved addresses on purpose, so the
 * EMPTY branch is what a fresh session shows. FAILED is coded but, like
 * `order-confirmation.tsx`'s FAILED branch for its in-memory source,
 * has no live trigger here: there is no `apiBaseUrl` for a local promise to
 * fail against. Reported as a gap rather than hidden.
 */
export function Addresses() {
  const state = useAsync<readonly Address[]>(() => sleep(300).then(() => []), []);
  const loaded = state.status === 'ready' ? state.data : null;

  // The list the visitor edits. Seeded from each completed load (a retry starts from the fresh
  // result, the way the Angular `load()` replaced the list), then mutated locally by add/remove.
  const [addresses, setAddresses] = useState<readonly Address[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    if (loaded) setAddresses(loaded);
  }, [loaded]);

  const addSample = () => {
    const id = `addr-${nextId.current++}`;
    setAddresses((list) => [...list, { id, label: 'Home', line: 'House 12, Road 5, Dhanmondi' }]);
  };

  const remove = (id: string) => {
    setAddresses((list) => list.filter((a) => a.id !== id));
  };

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-[--color-text]">Addresses</h1>

      {state.status === 'error' ? (
        <ErrorState
          className="mt-6 block"
          title="Could not load addresses"
          message={state.error}
          onRetry={state.reload}
        />
      ) : state.status === 'loading' ? (
        <>
          <div className="mt-6" aria-busy="true">
            <Card>
              <Skeleton count={2} height="1.25rem" />
            </Card>
          </div>
          <p className="sr-only" role="status">
            Loading addresses
          </p>
        </>
      ) : addresses.length === 0 ? (
        <EmptyState
          className="mt-6 block"
          title="No saved addresses"
          hint="Add an address to speed up checkout next time."
        >
          <Button type="button" size="sm" onClick={addSample}>
            Add an address
          </Button>
        </EmptyState>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-[--color-border] p-4"
            >
              <div>
                <p className="font-medium text-[--color-text]">{address.label}</p>
                <p className="text-sm text-[--color-text-muted]">{address.line}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(address.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
