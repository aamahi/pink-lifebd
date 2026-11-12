import { pageMetadata } from '@/core/seo';
import { Home } from '@/features/home/home';

export const metadata = pageMetadata({ title: '', path: '/' });

export default function HomePage() {
  return <Home />;
}
