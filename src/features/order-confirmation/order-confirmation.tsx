'use client';

import { useSeo, type PageSeo } from '@/core/seo';
import { useAsync } from '@/core/hooks/use-async';
import { lineTotal } from '@/core/stores/cart.store';
import { useOrders } from '@/core/stores/order.store';
import { formatMoney } from '@/core/utils/money';
import { formatSiteDate } from '@/core/utils/site-date';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Img } from '@/components/ui/image';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Order confirmation archetype, at `/order-confirmation/:orderId`.
 *
 * `orderId` arrives as a prop from the server `page.tsx` (`await params`). The load and the SEO are
 * both keyed off it, so a second activation of the same route with a different `:orderId` -- Next
 * reuses this component across a param-only change rather than remounting it -- reloads the order
 * and rewrites the title and canonical URL. A load run once on mount would leave a stale title and
 * canonical URL naming the FIRST order if a demo author ever links from one confirmation page to
 * another.
 *
 * NOT-FOUND stands in for EMPTY here, the same choice `product.tsx` makes for a single-entity page:
 * an order id that matches nothing has no "list" to be empty, only a missing record. FAILED is
 * written the same way every fixture-backed page in this template writes it (the order store's own
 * header comment), but is only reachable by pointing `NEXT_PUBLIC_API_BASE_URL` at a dead host --
 * the store's fixture path is in-memory and cannot fail on its own.
 */
export function OrderConfirmation({ orderId }: { orderId: string }) {
  const { getOrder } = useOrders();

  // `null` is the not-found outcome, exactly as the store reports an unknown id. A 404 from a real
  // API is the same fact, so it resolves to `null` too rather than to the failed branch. The store
  // throws `Request failed (404).` -- it has no status field to read, so the status is in the text.
  const result = useAsync(async () => {
    try {
      return await getOrder(orderId);
    } catch (err) {
      if (err instanceof Error && /\(404\)/.test(err.message)) return null;
      throw err;
    }
  }, [orderId, getOrder]);

  const path = `/order-confirmation/${orderId}`;
  let seo: PageSeo | null = null;
  if (result.status === 'ready') {
    seo =
      result.data === null
        ? { title: 'Order not found', path, noIndex: true }
        : {
            title: `Order ${result.data.id}`,
            description: 'Your order confirmation.',
            path,
            noIndex: true,
          };
  }
  useSeo(seo);

  const order = result.status === 'ready' ? result.data : null;

  return (
    <div className="min-h-[60vh] bg-(--color-rail-bg) font-jakarta text-(--color-rail-fg)">
      <section className="mx-auto w-full max-w-2xl px-4 py-10 lg:py-16">
        {result.status === 'error' ? (
          <div className="rounded-2xl bg-(--color-shop-tile)">
            <ErrorState
              title="Could not load this order"
              message={result.error}
              onRetry={result.reload}
            />
          </div>
        ) : result.status === 'loading' ? (
          <>
            <div aria-busy="true">
              <Skeleton shape="circle" height="3.5rem" className="mx-auto" />
              <div className="mx-auto mt-5 max-w-sm">
                <Skeleton count={2} height="1.5rem" />
              </div>
              <div className="mt-8">
                <Skeleton shape="block" height="14rem" />
              </div>
            </div>
            <p className="sr-only" role="status">
              Loading order
            </p>
          </>
        ) : order === null ? (
          <>
            <h1 className="font-display text-3xl font-semibold">Order not found</h1>
            <p className="mt-3 text-(--color-rail-muted)">
              Nothing here matches order <code className="font-mono">{orderId}</code>. It may have
              been placed in a different session -- orders are held in memory for this demo and do
              not survive a page reload.
            </p>
            <Button variant="dark" size="lg" className="mt-6" href="/shop">
              Browse the shop
            </Button>
          </>
        ) : (
          <>
            <div className="text-center" role="status">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-(--color-hero-to) text-(--color-hero-ink)">
                <svg
                  viewBox="0 0 24 24"
                  className="size-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </div>
              <h1 className="mt-5 font-display text-3xl font-semibold leading-tight md:text-4xl">
                Thank you for your order
              </h1>
              <p className="mt-2 text-sm text-(--color-rail-muted)">
                Order{' '}
                <span className="font-mono font-medium text-(--color-rail-fg)">{order.id}</span> ·{' '}
                {formatSiteDate(order.placedAt, 'datetime')}
              </p>
              <p className="mt-1 text-sm text-(--color-rail-muted)">
                Keep this number if you need to ask about your order.
              </p>
            </div>

            <div className="mt-8 rounded-2xl bg-linear-to-br from-(--color-hero-from) to-(--color-hero-to) p-5 sm:p-6">
              <ul className="flex flex-col gap-3">
                {order.lines.map((line) => (
                  <li key={line.product.id} className="flex items-center gap-3">
                    <div className="relative aspect-[4/5] w-14 shrink-0 rounded-lg bg-white/70">
                      {line.product.image ? (
                        <div className="absolute inset-1">
                          <Img
                            className="block h-full"
                            imgClass="mx-auto h-full w-auto"
                            src={line.product.image}
                            alt=""
                            width={645}
                            height={1000}
                          />
                        </div>
                      ) : null}
                      <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-(--color-rail-fg) px-1 text-[11px] font-semibold leading-5 text-(--color-rail-bg)">
                        {line.quantity}
                        <span className="sr-only"> ×</span>
                      </span>
                    </div>
                    <p className="min-w-0 flex-1 text-sm leading-snug">{line.product.name}</p>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {formatMoney(lineTotal(line), { compact: true })}
                    </p>
                  </li>
                ))}
              </ul>

              <dl className="mt-5 border-t border-(--color-hero-ink)/15 pt-4 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-(--color-rail-muted)">Subtotal</dt>
                  <dd className="font-medium tabular-nums">
                    {formatMoney(order.subtotal, { compact: true })}
                  </dd>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <dt className="text-(--color-rail-muted)">Delivery · {order.delivery.label}</dt>
                  <dd className="font-medium tabular-nums">
                    {formatMoney(order.delivery.fee, { compact: true })}
                  </dd>
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-(--color-hero-ink)/15 pt-4">
                  <dt className="text-base font-semibold">Total</dt>
                  <dd className="text-xl font-semibold tabular-nums">
                    {formatMoney(order.total, { compact: true })}
                  </dd>
                </div>
              </dl>
            </div>

            <p className="mt-4 text-center text-sm text-(--color-rail-muted)">
              Status: <span className="font-medium text-(--color-rail-fg)">{order.status}</span>
            </p>

            <Button variant="dark" size="lg" block className="mt-6" href="/shop">
              Continue shopping
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
