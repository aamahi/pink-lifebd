'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/core/stores/auth.store';

/**
 * Guards every route under `/account/portal` (`app/account/portal/layout.tsx` wraps the whole group
 * in this, so it runs once per portal entry rather than once per child page).
 *
 * `router.replace`, not `push`, is the counterpart of Angular's returning a `UrlTree` from the guard:
 * the blocked portal path is swapped for `/account/login` rather than left behind it in the history,
 * so Back from the login screen does not land on a route that would only redirect again.
 *
 * Renders nothing while logged out -- the redirect runs in an effect, and without this the portal
 * chrome would flash for one frame on the way out (a guard has to keep the guarded page off screen,
 * not merely navigate away from it).
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) router.replace('/account/login');
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return null;
  return <>{children}</>;
}
