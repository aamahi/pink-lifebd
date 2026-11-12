import { Login } from '@/features/account/login/login';
import { SITE } from '@/core/config/site.config';
import { pageMetadata } from '@/core/seo';

export const metadata = pageMetadata({
  title: 'Log In',
  description: `Log in to ${SITE.name}.`,
  path: '/account/login',
  noIndex: true,
});

export default function LoginPage() {
  return <Login />;
}
