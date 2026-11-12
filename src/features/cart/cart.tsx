'use client';

import Link from 'next/link';
import { stockLabel } from '@/core/data/stock';
import { lineTotal, useCart, type CartLine } from '@/core/stores/cart.store';
import { formatMoney } from '@/core/utils/money';
import { ClickableRow } from '@/components/shared/navigation/clickable-row';
import { RecordLink } from '@/components/shared/navigation/record-link';
import { Button } from '@/components/ui/button';
import { DeliveryZones } from '@/components/ui/delivery-zones';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Img } from '@/components/ui/image';
import { Skeleton } from '@/components/ui/skeleton';

/** A sanity ceiling for a product whose stock is not tracked; tracked stock lowers it. */
const MAX_QUANTITY = 99;
/** At or under this many left, the cart says so. */
const LOW_STOCK = 10;

/** Tracked stock is a hard ceiling; untracked stock (`null`) is orderable, up to a sanity cap. */
function maxQuantity(line: CartLine): number {
  const stock = line.product.stock;
  return stock === null ? MAX_QUANTITY : Math.min(stock, MAX_QUANTITY);
}

/** "Only 3 left" for a line near its tracked stock; nothing for untracked or plentiful stock. */
function lowStock(line: CartLine): string | null {
  const stock = line.product.stock;
  return stock !== null && stock > 0 && stock <= LOW_STOCK ? stockLabel(line.product) : null;
}

/**
 * Cart archetype, at `/cart`.
 *
 * Logic lives in the cart store (`core/stores/cart.store.ts`); this component only renders its
 * state and forwards clicks -- issue #937's own requirement for this archetype.
 *
 * FAILED and LOADING come from the store's `hydrate()` call, which `MainLayout` runs once on mount
 * -- the same fixture-latency-backed load every other archetype uses, so pointing
 * `NEXT_PUBLIC_API_BASE_URL` at a dead host demonstrates FAILED here exactly the way it does on
 * `/shop` or `/product/:slug`. EMPTY is reachable live, by removing every line or pressing "Clear
 * cart".
 *
 * **Built for a phone first.** Most visitors arrive on one, so: every control is at least 40px,
 * the photo and name open the product, the quantity is a stepper rather than a typed number, and
 * a bar with the total and the Checkout button stays at the foot of the screen while the lines
 * scroll. That bar is `sticky` inside this page, not `fixed`, so it floats over the list but
 * comes to rest above the footer instead of covering it. From `lg` up the summary card is the
 * sticky element and the bar is gone.
 *
 * **Delivery.** The fee depends on where the order is going, so the summary asks for the area
 * (`DeliveryZones`) and adds the fee to a total. The choice lives in the cart store, so
 * checkout opens with the same answer.
 *
 * A line with no stated price shows "Price not available" and has no total, the cart total then
 * has no value either, and Checkout is withheld: a total that quietly skipped the line would be a
 * price that is wrong in the direction a customer acts on.
 */
export function Cart() {
  const cart = useCart();

  return (
    <div className="min-h-[60vh] bg-(--color-rail-bg) font-jakarta text-(--color-rail-fg)">
      <section
        className="mx-auto w-full max-w-[1320px] px-4 py-6 lg:px-20 lg:py-10"
        aria-labelledby="cart-title"
      >
        <h1
          id="cart-title"
          className="font-display text-3xl font-semibold leading-tight md:text-4xl"
        >
          Your cart
        </h1>

        {cart.error ? (
          <div className="mt-6 rounded-2xl bg-(--color-shop-tile)">
            <ErrorState
              title="Could not load your cart"
              message={cart.error}
              onRetry={() => void cart.hydrate()}
            />
          </div>
        ) : !cart.ready ? (
          <>
            <div
              className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-14"
              aria-busy="true"
            >
              <div className="flex flex-col gap-6">
                {[1, 2].map((n) => (
                  <div key={n} className="flex gap-4">
                    <Skeleton shape="block" height="8.75rem" className="w-24 shrink-0 sm:w-28" />
                    <div className="flex-1 pt-1">
                      <Skeleton count={3} height="1rem" />
                    </div>
                  </div>
                ))}
              </div>
              <Skeleton shape="block" height="24rem" />
            </div>
            <p className="sr-only" role="status">
              Loading cart
            </p>
          </>
        ) : cart.items.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-(--color-shop-tile) py-6">
            <EmptyState
              title="Your cart is empty"
              hint="Add something from the shop to see it here."
            >
              <Button variant="dark" size="lg" href="/shop">
                Browse the shop
              </Button>
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-14">
              <div>
                <div className="flex items-center justify-between border-b border-(--color-rail-border) pb-3">
                  <p className="text-sm text-(--color-rail-muted)">
                    {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
                  </p>
                  <button
                    type="button"
                    className="rounded-md px-1 py-1 text-sm font-medium text-(--color-rail-muted) underline-offset-4 outline-none hover:text-(--color-rail-fg) hover:underline focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
                    onClick={() => cart.clear()}
                  >
                    Clear cart
                  </button>
                </div>

                <ul className="divide-y divide-(--color-rail-border)">
                  {cart.items.map((line) => (
                    <ClickableRow
                      as="li"
                      key={line.product.id}
                      className="relative flex gap-4 py-5 sm:gap-5"
                      route={['/product', line.product.slug]}
                    >
                      <div className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-xl bg-(--color-shop-tile) sm:w-28">
                        {line.product.image ? (
                          <div className="absolute inset-2">
                            <Img
                              className="block h-full"
                              imgClass="mx-auto h-full w-auto"
                              src={line.product.image}
                              alt={line.product.name}
                              width={645}
                              height={1000}
                            />
                          </div>
                        ) : (
                          <div className="grid h-full place-items-center text-[11px] text-(--color-rail-muted)">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-[15px] font-medium leading-snug [&_a]:text-(--color-rail-fg) [&_a]:no-underline [&_a:hover]:underline">
                            <RecordLink route={['/product', line.product.slug]}>
                              {line.product.name}
                            </RecordLink>
                          </h2>
                          <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                            {formatMoney(lineTotal(line), { compact: true })}
                          </p>
                        </div>

                        {line.product.price === null ? (
                          <p className="mt-0.5 text-sm font-medium text-warning">
                            Price not available
                          </p>
                        ) : (
                          <p className="mt-0.5 text-sm text-(--color-rail-muted)">
                            {formatMoney(line.product.price, { compact: true })} each
                          </p>
                        )}
                        {lowStock(line) ? (
                          <p className="mt-0.5 text-xs font-medium text-warning">
                            {lowStock(line)}
                          </p>
                        ) : null}

                        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                          <div
                            className="relative z-10 inline-flex items-center rounded-full border border-(--color-rail-border) bg-(--color-rail-bg)"
                            role="group"
                            aria-label={'Quantity of ' + line.product.name}
                          >
                            <button
                              type="button"
                              className="grid size-10 place-items-center rounded-full outline-none transition-colors hover:bg-(--color-shop-tile) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) disabled:opacity-30 disabled:hover:bg-transparent"
                              disabled={line.quantity <= 1}
                              aria-label={'Decrease quantity of ' + line.product.name}
                              onClick={() => cart.setQuantity(line.product.id, line.quantity - 1)}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="size-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                aria-hidden="true"
                              >
                                <path d="M5 12h14" />
                              </svg>
                            </button>
                            <span
                              className="min-w-8 text-center text-sm font-semibold tabular-nums"
                              aria-live="polite"
                            >
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              className="grid size-10 place-items-center rounded-full outline-none transition-colors hover:bg-(--color-shop-tile) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) disabled:opacity-30 disabled:hover:bg-transparent"
                              disabled={line.quantity >= maxQuantity(line)}
                              aria-label={'Increase quantity of ' + line.product.name}
                              onClick={() => cart.setQuantity(line.product.id, line.quantity + 1)}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="size-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                aria-hidden="true"
                              >
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                            </button>
                          </div>

                          <button
                            type="button"
                            className="relative z-10 inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-(--color-rail-muted) outline-none transition-colors hover:text-(--color-rail-fg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
                            aria-label={'Remove ' + line.product.name + ' from cart'}
                            onClick={() => cart.remove(line.product.id)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="size-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
                            </svg>
                            <span className="max-[389px]:sr-only">Remove</span>
                          </button>
                        </div>
                      </div>
                    </ClickableRow>
                  ))}
                </ul>
              </div>

              <aside
                aria-labelledby="summary-title"
                className="rounded-2xl bg-linear-to-br from-(--color-hero-from) to-(--color-hero-to) p-5 sm:p-6 lg:sticky lg:top-28"
              >
                <h2 id="summary-title" className="font-display text-xl font-semibold">
                  Order summary
                </h2>

                <dl className="mt-5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-(--color-rail-muted)">Subtotal</dt>
                    <dd className="font-medium tabular-nums">
                      {formatMoney(cart.subtotal, { compact: true })}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5">
                  <p className="mb-2 text-sm font-medium">Where should we deliver?</p>
                  <DeliveryZones
                    zones={cart.deliveryZones}
                    selected={cart.selectedZoneId}
                    onPicked={cart.setDeliveryZone}
                  />
                </div>

                <dl className="mt-5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-(--color-rail-muted)">
                      Delivery · {cart.deliveryZone.label}
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {formatMoney(cart.deliveryFee, { compact: true })}
                    </dd>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-(--color-hero-ink)/15 pt-4">
                    <dt className="text-base font-semibold">Total</dt>
                    <dd className="text-xl font-semibold tabular-nums">
                      {formatMoney(cart.total, { compact: true })}
                    </dd>
                  </div>
                </dl>

                {cart.total === null ? (
                  <p className="mt-4 text-sm text-(--color-rail-fg)" role="status">
                    Some items have no price yet, so we cannot work out your total. Remove them to
                    continue.
                  </p>
                ) : (
                  <Button
                    variant="dark"
                    size="lg"
                    block
                    className="mt-5 max-lg:hidden"
                    href="/checkout"
                  >
                    Proceed to checkout
                  </Button>
                )}
                <Link
                  href="/shop"
                  className="mt-3 block rounded-md py-2 text-center text-sm font-medium text-(--color-rail-muted) underline-offset-4 hover:text-(--color-rail-fg) hover:underline"
                >
                  Continue shopping
                </Link>
              </aside>
            </div>

            {cart.total !== null ? (
              <div
                data-action-bar
                className="sticky bottom-(--bottom-bar-height) z-20 -mx-4 mt-6 flex items-center gap-4 border-t border-(--color-rail-border) bg-(--color-rail-bg)/95 px-4 py-3 backdrop-blur lg:hidden"
              >
                <div className="min-w-0">
                  <p className="text-xs text-(--color-rail-muted)">Total</p>
                  <p className="text-lg font-semibold leading-tight tabular-nums">
                    {formatMoney(cart.total, { compact: true })}
                  </p>
                </div>
                <Button variant="dark" size="lg" className="flex-1" href="/checkout">
                  Checkout
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
