import { Profile } from '@/features/account/portal/profile/profile';
import { pageMetadata } from '@/core/seo';

export const metadata = pageMetadata({
  title: 'Profile',
  path: '/account/portal/profile',
  noIndex: true,
});

export default function ProfilePage() {
  return <Profile />;
}
