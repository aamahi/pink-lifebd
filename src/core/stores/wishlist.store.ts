'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import type { Product } from '@/core/data/catalog.model';

/**
 * Saved-for-later products, shared by every heart in the app: the header's count, the home hero's
 * detail panel, and `/wishlist`. (Port of the Angular `WishlistService`.)
 *
 * In memory only, the same as the cart's lines: a refresh empties it, and the two behave alike until
 * a backend owns both. Entries are whole `Product`s rather than ids so `/wishlist` can render and
 * move them to the cart without a catalogue lookup -- the hero rail's pieces are not in the
 * catalogue.
 */
interface WishlistState {
  readonly entries: readonly Product[];
  add: (product: Product) => void;
  remove: (productId: string) => void;
  /** Save if absent, remove if present. Returns whether it is saved afterwards. */
  toggle: (product: Product) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  entries: [],

  add: (product) => {
    if (get().entries.some((p) => p.id === product.id)) return;
    set((s) => ({ entries: [...s.entries, product] }));
  },

  remove: (productId) => set((s) => ({ entries: s.entries.filter((p) => p.id !== productId) })),

  toggle: (product) => {
    if (get().entries.some((p) => p.id === product.id)) {
      get().remove(product.id);
      return false;
    }
    get().add(product);
    return true;
  },

  clear: () => set({ entries: [] }),
}));

/** `{ items, count, ids, add, remove, toggle, clear }` -- the Angular service's surface. */
export function useWishlist() {
  const items = useWishlistStore((s) => s.entries);
  const add = useWishlistStore((s) => s.add);
  const remove = useWishlistStore((s) => s.remove);
  const toggle = useWishlistStore((s) => s.toggle);
  const clear = useWishlistStore((s) => s.clear);
  /** For a view asking "is this one saved?" without scanning the list each time. */
  const ids = useMemo(() => new Set(items.map((p) => p.id)), [items]);
  return { items, count: items.length, ids, add, remove, toggle, clear };
}
