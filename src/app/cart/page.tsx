import { pageMetadata } from '@/core/seo';
import { Cart } from '@/features/cart/cart';

export const metadata = pageMetadata({
  title: 'Cart',
  description: 'Review the items in your cart.',
  path: '/cart',
  noIndex: true,
});

export default function CartPage() {
  return <Cart />;
}
