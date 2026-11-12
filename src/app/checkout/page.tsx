import { pageMetadata } from '@/core/seo';
import { Checkout } from '@/features/checkout/checkout';

export const metadata = pageMetadata({
  title: 'Checkout',
  description: 'Complete your order.',
  path: '/checkout',
  noIndex: true,
});

export default function CheckoutPage() {
  return <Checkout />;
}
