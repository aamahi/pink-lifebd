import { Dashboard } from '@/features/account/portal/dashboard/dashboard';
import { pageMetadata } from '@/core/seo';

export const metadata = pageMetadata({
  title: 'Dashboard',
  path: '/account/portal/dashboard',
  noIndex: true,
});

export default function DashboardPage() {
  return <Dashboard />;
}
