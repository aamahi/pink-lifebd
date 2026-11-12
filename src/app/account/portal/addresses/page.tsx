import { Addresses } from '@/features/account/portal/addresses/addresses';
import { pageMetadata } from '@/core/seo';

export const metadata = pageMetadata({
  title: 'Addresses',
  path: '/account/portal/addresses',
  noIndex: true,
});

export default function AddressesPage() {
  return <Addresses />;
}
