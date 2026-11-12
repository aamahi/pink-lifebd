import { pageMetadata } from '@/core/seo';
import { Wishlist } from '@/features/wishlist/wishlist';

export const metadata = pageMetadata({
  title: 'Wishlist',
  description: 'Pieces you have saved for later.',
  path: '/wishlist',
  noIndex: true,
});

export default function WishlistPage() {
  return <Wishlist />;
}
