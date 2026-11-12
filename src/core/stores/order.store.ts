'use client';

import { create } from 'zustand';
import { environment } from '@/core/config/env';
import { FIXTURE_LATENCY_MS, sleep, usingFixtures } from '@/core/data/catalog.api';
import type { CartLine } from '@/core/stores/cart.store';

export type OrderStatus = 'processing' | 'shipped' | 'delivered';

/**
 * The delivery band an order was placed under, as it stood at checkout: label and fee are copied,
 * not looked up later, so a later change to the fee table cannot rewrite an old order.
 */
export interface OrderDelivery {
  readonly zone: string;
  readonly label: string;
  readonly fee: number;
}

/**
 * Who the order is for and where it goes: what the courier needs and what the shop rings to
 * confirm. `note` is the customer's optional message ('' when none).
 */
export interface OrderCustomer {
  readonly name: string;
  readonly phone: string;
  readonly address: string;
  readonly note: string;
}

export interface OrderSummary {
  readonly id: string;
  readonly placedAt: string;
  /** null for an order placed without details (nothing in the template does that any more). */
  readonly customer: OrderCustomer | null;
  readonly lines: readonly CartLine[];
  /** Goods only. */
  readonly subtotal: number | null;
  readonly delivery: OrderDelivery;
  /** Goods plus delivery -- what the customer was told they would pay. */
  readonly total: number | null;
  readonly status: OrderStatus;
}

const base = environment.apiBaseUrl.replace(/\/+$/, '');

/**
 * Order placement and lookup (port of the Angular `OrderService`), shared by checkout (`placeOrder`),
 * the confirmation page and the account portal's orders pages (`getOrder` / `listOrders`).
 *
 * The order history starts EMPTY on purpose, not seeded with fixture rows the way the cart is seeded:
 * walking cart -> checkout -> confirmation lets the portal's Orders tab go from empty to one row live,
 * which is a more convincing demonstration of the EMPTY state than a fixture that starts populated.
 *
 * Same fixture-vs-API split as the catalogue. FAILED is reachable in fixture mode only by pointing
 * `NEXT_PUBLIC_API_BASE_URL` at a dead host, because the in-memory path has nothing that can fail.
 * All three methods are async: a rejection is the failed branch.
 */
interface OrderState {
  readonly orders: readonly OrderSummary[];
  placeOrder: (
    lines: readonly CartLine[],
    subtotal: number | null,
    delivery: OrderDelivery,
    total: number | null,
    customer: OrderCustomer,
  ) => Promise<string>;
  listOrders: () => Promise<readonly OrderSummary[]>;
  getOrder: (orderId: string) => Promise<OrderSummary | null>;
}

const generateId = () => `ORD-${Date.now().toString(36).toUpperCase()}`;

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],

  placeOrder: async (lines, subtotal, delivery, total, customer) => {
    if (usingFixtures) {
      const id = generateId();
      const summary: OrderSummary = {
        id,
        placedAt: new Date().toISOString(),
        customer,
        lines,
        subtotal,
        delivery,
        total,
        status: 'processing',
      };
      await sleep(FIXTURE_LATENCY_MS);
      set((s) => ({ orders: [summary, ...s.orders] }));
      return id;
    }
    const res = await fetch(`${base}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, lines, subtotal, delivery, total }),
    });
    if (!res.ok) throw new Error(`Request failed (${res.status}).`);
    return ((await res.json()) as { id: string }).id;
  },

  listOrders: async () => {
    if (usingFixtures) {
      await sleep(FIXTURE_LATENCY_MS);
      return get().orders;
    }
    const res = await fetch(`${base}/orders`);
    if (!res.ok) throw new Error(`Request failed (${res.status}).`);
    return (await res.json()) as OrderSummary[];
  },

  getOrder: async (orderId) => {
    if (usingFixtures) {
      await sleep(FIXTURE_LATENCY_MS);
      return get().orders.find((o) => o.id === orderId) ?? null;
    }
    const res = await fetch(`${base}/orders/${encodeURIComponent(orderId)}`);
    if (!res.ok) throw new Error(`Request failed (${res.status}).`);
    return (await res.json()) as OrderSummary;
  },
}));

/** `const { placeOrder, listOrders, getOrder } = useOrders();` -- stable references. */
export function useOrders() {
  const placeOrder = useOrderStore((s) => s.placeOrder);
  const listOrders = useOrderStore((s) => s.listOrders);
  const getOrder = useOrderStore((s) => s.getOrder);
  return { placeOrder, listOrders, getOrder };
}
