import { Orders } from '@/features/account/portal/orders/orders';
import { pageMetadata } from '@/core/seo';

export const metadata = pageMetadata({
  title: 'Orders',
  path: '/account/portal/orders',
  noIndex: true,
});

export default function OrdersPage() {
  return <Orders />;
}
