import { pageMetadata } from '@/core/seo';
import { SITE } from '@/core/config/site.config';
import { ContactUs } from '@/features/static/contact-us/contact-us';

export const metadata = pageMetadata({
  title: 'Contact',
  description: `Get in touch with ${SITE.name}.`,
  path: '/contact-us',
});

export default function ContactUsPage() {
  return <ContactUs />;
}
