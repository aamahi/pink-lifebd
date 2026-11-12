'use client';

import { BackLink } from '@/components/shared/navigation/back-link';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/core/hooks/use-async';
import { useSeo } from '@/core/seo';
import { useOrders } from '@/core/stores/order.store';
import { formatMoney } from '@/core/utils/money';
import { formatSiteDate } from '@/core/utils/site-date';

/**
 * `/account/portal/orders/[id]` -- one order, in full.
 *
 * Same shape as `order-confirmation.tsx`: `id` arrives as a prop from the route's `params`, and the
 * load re-runs when it changes (`useAsync` deps) rather than reading it once at mount -- the same
 * route-reuse reason that file's header comment explains, since Next keeps this component mounted
 * when only the segment changes. NOT-FOUND stands in for EMPTY since a single order either exists or
 * it does not.
 *
 * Both the not-found and loaded branches render `BackLink` with the same
 * `fallback` (navigation contract, ecom-fullstack#82/#83) instead of a literal
 * link to `/account/portal/orders` -- a `returnTo` on the way in (e.g.
 * from a filtered order-history view) is honoured either way.
 */
export function OrderDetail({ id }: { id: string }) {
  const { getOrder } = useOrders();
  const state = useAsync(() => getOrder(id), [id, getOrder]);

  const order = state.status === 'ready' ? state.data : null;
  // Applied once the lookup settles, never while loading or failed: the title is the order id, which
  // is unknown until then (the route's static `Order Detail` title stands in until it is).
  useSeo(
    state.status === 'ready'
      ? {
          title: order ? order.id : 'Order not found',
          path: `/account/portal/orders/${id}`,
          noIndex: true,
        }
      : null,
  );

  if (state.status === 'error') {
    return (
      <ErrorState title="Could not load this order" message={state.error} onRetry={state.reload} />
    );
  }

  if (state.status === 'loading') {
    return (
      <>
        <div aria-busy="true">
          <Skeleton count={4} height="1rem" />
        </div>
        <p className="sr-only" role="status">
          Loading order
        </p>
      </>
    );
  }

  if (order === null) {
    return (
      <>
        <h1 className="text-2xl font-bold text-[--color-text]">Order not found</h1>
        <p className="mt-2 text-[--color-text-muted]">
          No order matches <code className="font-mono">{id}</code>.
        </p>
        <BackLink className="mt-4" fallback="/account/portal/orders" label="Back to orders" />
      </>
    );
  }

  return (
    <>
      <BackLink fallback="/account/portal/orders" label="Back to orders" />
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-[--color-text]">{order.id}</h1>
      <p className="mt-1 text-sm text-[--color-text-muted]">
        {formatSiteDate(order.placedAt, 'datetime')}
      </p>
      <Badge className="mt-2" tone="info">
        {order.status}
      </Badge>

      <ul className="mt-6 flex flex-col divide-y divide-[--color-border]">
        {order.lines.map((line) => (
          <li key={line.product.id} className="flex justify-between gap-2 py-2 text-sm">
            <span className="text-[--color-text]">
              {line.product.name} × {line.quantity}
            </span>
            <span className="text-[--color-text-muted]">{formatMoney(line.product.price)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-[--color-border] pt-4 font-semibold text-[--color-text]">
        Total: {formatMoney(order.total)}
      </p>
    </>
  );
}
