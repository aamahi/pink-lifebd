'use client';

import Link from 'next/link';
import { ClickableRow } from '@/components/shared/navigation/clickable-row';
import { RecordLink } from '@/components/shared/navigation/record-link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/core/hooks/use-async';
import { useOrders } from '@/core/stores/order.store';
import { formatMoney } from '@/core/utils/money';
import { formatSiteDate } from '@/core/utils/site-date';

/**
 * Portal order history -- the account-portal archetype's main demonstration of
 * the async states (`dashboard.tsx`'s header comment explains
 * why it, not that page, carries this).
 *
 * The order store's in-memory order list starts EMPTY (`order.store.ts`'s own
 * header comment), so this page shows the EMPTY branch by default in a fresh
 * session -- placing an order through `/cart` -> `/checkout` and back is what
 * turns it into LOADED live, with no page reload needed since both this
 * component and the order store are module-level singletons for the
 * lifetime of the app.
 */
export function Orders() {
  const { listOrders } = useOrders();
  const state = useAsync(() => listOrders(), [listOrders]);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-[--color-text]">Orders</h1>

      {state.status === 'error' ? (
        <ErrorState
          className="mt-6 block"
          title="Could not load orders"
          message={state.error}
          onRetry={state.reload}
        />
      ) : state.status === 'loading' ? (
        <>
          <div className="mt-6" aria-busy="true">
            <Card>
              <Skeleton count={3} height="1.25rem" />
            </Card>
          </div>
          <p className="sr-only" role="status">
            Loading orders
          </p>
        </>
      ) : state.data.length === 0 ? (
        <EmptyState
          className="mt-6 block"
          title="No orders yet"
          hint="Orders you place will show up here."
        >
          <Link href="/shop" className="text-sm text-primary hover:underline">
            Browse the shop
          </Link>
        </EmptyState>
      ) : (
        <ul className="mt-6 flex flex-col divide-y divide-[--color-border]">
          {state.data.map((order) => (
            <ClickableRow
              key={order.id}
              as="li"
              route={['/account/portal/orders', order.id]}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <RecordLink route={['/account/portal/orders', order.id]} className="font-mono text-sm">
                  {order.id}
                </RecordLink>
                <p className="text-xs text-[--color-text-muted]">
                  {formatSiteDate(order.placedAt, 'datetime')}
                </p>
              </div>
              <Badge tone="info">{order.status}</Badge>
              <p className="text-sm font-medium text-[--color-text]">{formatMoney(order.total)}</p>
            </ClickableRow>
          ))}
        </ul>
      )}
    </>
  );
}
