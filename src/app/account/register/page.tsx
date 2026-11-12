import { Register } from '@/features/account/register/register';
import { SITE } from '@/core/config/site.config';
import { pageMetadata } from '@/core/seo';

export const metadata = pageMetadata({
  title: 'Register',
  description: `Create an account with ${SITE.name}.`,
  path: '/account/register',
  noIndex: true,
});

export default function RegisterPage() {
  return <Register />;
}
