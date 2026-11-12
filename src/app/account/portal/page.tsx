import { redirect } from 'next/navigation';

/**
 * `/account/portal` itself is an intra-feature default, not an unknown url silently landing
 * somewhere else: it only ever redirects to a real, declared child -- the same pattern a
 * dashboard-first app uses for its own index route.
 */
export default function PortalIndexPage() {
  redirect('/account/portal/dashboard');
}
