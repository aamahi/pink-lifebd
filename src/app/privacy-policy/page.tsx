import { pageMetadata } from '@/core/seo';
import { SITE } from '@/core/config/site.config';
import { PrivacyPolicy } from '@/features/static/privacy-policy/privacy-policy';

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description: `${SITE.name}'s privacy policy.`,
  path: '/privacy-policy',
  noIndex: true,
});

export default function PrivacyPolicyPage() {
  return <PrivacyPolicy />;
}
