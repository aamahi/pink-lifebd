import type { Metadata } from 'next';
import { OrderDetail } from '@/features/account/portal/orders/order-detail/order-detail';
import { pageMetadata } from '@/core/seo';

type Params = Promise<{ id: string }>;

// The route's static title. `OrderDetail` replaces it with the order id (or `Order not found`) once
// the lookup settles, which is what the Angular component's `seo.apply` did after the route title.
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return pageMetadata({
    title: 'Order Detail',
    path: `/account/portal/orders/${id}`,
    noIndex: true,
  });
}

export default async function OrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
