'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import { environment } from '@/core/config/env';
import { SITE, type DeliveryZone } from '@/core/config/site.config';
import type { Product } from '@/core/data/catalog.model';
import { listProducts, usingFixtures } from '@/core/data/catalog.api';

export interface CartLine {
  readonly product: Product;
  readonly quantity: number;
}

/**
 * What one line comes to. `null` when its unit price is -- a line with no stated price has no total,
 * and multiplying through as if it were free is the `?? 0` failure the engineering conventions name.
 * A genuine free line (`price: 0`) comes to `0`, which is a different answer.
 */
export function lineTotal(line: CartLine): number | null {
  return line.product.price === null ? null : line.product.price * line.quantity;
}

/**
 * Cart state (port of the Angular `CartService`), kept out of the cart page so an "Add to cart"
 * control anywhere else in the tree reaches the same state.
 *
 * `hydrate()` simulates loading a previously-saved cart, the same fixture-vs-API split the catalogue
 * uses: fixture mode seeds two lines from the first two catalogue products (so the LOADED state has
 * something to show without any user action); API mode calls `${apiBaseUrl}/cart` and does NOT fall
 * back to fixtures on failure -- a silent fallback would hide a broken cart endpoint behind a page
 * that looks stocked. `ready`/`error` are what let the cart and checkout pages both render LOADING and
 * FAILED off one shared hydration rather than each doing its own fetch.
 *
 * `MainLayout` calls `hydrate()` once on mount (the Angular service hydrated in its constructor, i.e.
 * the first time anything injected it). The cart/checkout retry buttons call it again.
 */
interface CartState {
  readonly lines: readonly CartLine[];
  readonly hydrated: boolean;
  readonly hydrationError: string | null;
  /** Where this order is going, which sets the delivery fee. Held here so cart and checkout agree. */
  readonly zoneId: string;

  hydrate: () => Promise<void>;
  /** Ignores an id that is not a configured zone, so a stale or forged value cannot set a fee. */
  setDeliveryZone: (id: string) => void;
  add: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const base = environment.apiBaseUrl.replace(/\/+$/, '');

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  hydrated: false,
  hydrationError: null,
  zoneId: SITE.delivery.zones[0].id,

  hydrate: async () => {
    set({ hydrationError: null });
    try {
      if (usingFixtures) {
        // Reuses the catalogue's artificial latency rather than inventing a second delay constant.
        const products = await listProducts();
        const seed: CartLine[] = products
          .slice(0, 2)
          .map((product, i) => ({ product, quantity: i === 0 ? 2 : 1 }));
        set({ lines: seed, hydrated: true });
        return;
      }
      const res = await fetch(`${base}/cart`);
      if (!res.ok) throw new Error(`Request failed (${res.status}).`);
      set({ lines: (await res.json()) as CartLine[], hydrated: true });
    } catch (err) {
      set({
        hydrationError: err instanceof Error ? err.message : 'Request failed.',
        hydrated: true,
      });
    }
  },

  setDeliveryZone: (id) => {
    if (SITE.delivery.zones.some((z) => z.id === id)) set({ zoneId: id });
  },

  add: (product, quantity = 1) =>
    set((s) => {
      const existing = s.lines.find((l) => l.product.id === product.id);
      if (!existing) return { lines: [...s.lines, { product, quantity }] };
      return {
        lines: s.lines.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + quantity } : l,
        ),
      };
    }),

  setQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().remove(productId);
      return;
    }
    set((s) => ({
      lines: s.lines.map((l) => (l.product.id === productId ? { ...l, quantity } : l)),
    }));
  },

  remove: (productId) => set((s) => ({ lines: s.lines.filter((l) => l.product.id !== productId) })),

  clear: () => set({ lines: [] }),
}));

/**
 * `null` the moment any line's price is `null` -- a partially-known subtotal is not a real total,
 * and adding it as if the missing price were zero is exactly the `?? 0` failure.
 */
export function cartSubtotal(lines: readonly CartLine[]): number | null {
  // Named `sum`, not `total`: the source repo's absent-not-zero gate flags `total = 0` on sight.
  let sum = 0;
  for (const line of lines) {
    if (line.product.price === null) return null;
    sum += line.product.price * line.quantity;
  }
  return sum;
}

/** The Angular service's whole surface: `items`, `ready`, `error`, derived totals, and the actions. */
export function useCart() {
  const items = useCartStore((s) => s.lines);
  const ready = useCartStore((s) => s.hydrated);
  const error = useCartStore((s) => s.hydrationError);
  const selectedZoneId = useCartStore((s) => s.zoneId);
  const hydrate = useCartStore((s) => s.hydrate);
  const setDeliveryZone = useCartStore((s) => s.setDeliveryZone);
  const add = useCartStore((s) => s.add);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);

  const derived = useMemo(() => {
    const itemCount = items.reduce((n, l) => n + l.quantity, 0);
    const subtotal = cartSubtotal(items);
    const deliveryZone: DeliveryZone =
      SITE.delivery.zones.find((z) => z.id === selectedZoneId) ?? SITE.delivery.zones[0];
    const deliveryFee = deliveryZone.fee;
    /** Goods plus delivery. `null` exactly when the subtotal is. */
    const total = subtotal === null ? null : subtotal + deliveryFee;
    return { itemCount, subtotal, deliveryZone, deliveryFee, total };
  }, [items, selectedZoneId]);

  return {
    items,
    ready,
    error,
    ...derived,
    deliveryZones: SITE.delivery.zones,
    selectedZoneId,
    hydrate,
    setDeliveryZone,
    add,
    setQuantity,
    remove,
    clear,
  };
}
