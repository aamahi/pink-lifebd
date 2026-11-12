import { pageMetadata } from '@/core/seo';
import { LandingPage } from '@/features/landing/landing-page';
import { LANDING_PAGES } from '@/features/landing/landing.config';

const config = LANDING_PAGES.nightwear;

export const metadata = pageMetadata({ ...config.seo, path: config.path });

export default function NightwearLandingPage() {
  return <LandingPage slug={config.slug} />;
}
