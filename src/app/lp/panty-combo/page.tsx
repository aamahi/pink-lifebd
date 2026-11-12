import { pageMetadata } from '@/core/seo';
import { LandingPage } from '@/features/landing/landing-page';
import { LANDING_PAGES } from '@/features/landing/landing.config';

const config = LANDING_PAGES['panty-combo'];

export const metadata = pageMetadata({ ...config.seo, path: config.path });

export default function PantyComboLandingPage() {
  return <LandingPage slug={config.slug} />;
}
