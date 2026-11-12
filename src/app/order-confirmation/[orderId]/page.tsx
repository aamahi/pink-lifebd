import type { Metadata } from 'next';
import { pageMetadata } from '@/core/seo';
import { OrderConfirmation } from '@/features/order-confirmation/order-confirmation';

type Params = Promise<{ orderId: string }>;

// The server can only state the pre-load title; the component re-applies the real one (`Order <id>`,
// or `Order not found`) through `useSeo` once the order has loaded, the same two-step the Angular
// route `title` plus `SeoService.apply` made.
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { orderId } = await params;
  return pageMetadata({
    title: 'Order Confirmation',
    path: `/order-confirmation/${orderId}`,
    noIndex: true,
  });
}

export default async function OrderConfirmationPage({ params }: { params: Params }) {
  const { orderId } = await params;
  return <OrderConfirmation orderId={orderId} />;
}
