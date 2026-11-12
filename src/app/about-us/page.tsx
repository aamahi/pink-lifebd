import { pageMetadata } from '@/core/seo';
import { SITE } from '@/core/config/site.config';
import { AboutUs } from '@/features/static/about-us/about-us';

export const metadata = pageMetadata({
  title: 'About Us',
  description: `Learn about ${SITE.name}.`,
  path: '/about-us',
});

export default function AboutUsPage() {
  return <AboutUs />;
}
