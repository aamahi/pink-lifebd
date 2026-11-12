'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/core/stores/auth.store';
import { cn } from '@/core/utils/cn';

const LINK_CLASS =
  'rounded-md px-3 py-2 text-sm font-medium text-[--color-text] hover:bg-black/5';
const ACTIVE_CLASS = 'bg-primary/10 text-primary';

const SECTIONS = [
  { href: '/account/portal/dashboard', label: 'Dashboard' },
  { href: '/account/portal/orders', label: 'Orders' },
  { href: '/account/portal/profile', label: 'Profile' },
  { href: '/account/portal/addresses', label: 'Addresses' },
] as const;

/**
 * Portal sub-navigation: the four account sections plus a "Log out" control.
 *
 * "Active" is the same prefix match Angular's `routerLinkActive` (non-exact) applied: a section stays
 * highlighted on its own child pages, so `/account/portal/orders/ORD-1` still lights up "Orders".
 *
 * "Log out" calls `useAuth().logout()` and nothing else -- `AuthGuard` (in the portal layout, above
 * this component) reacts to `isLoggedIn` flipping false and sends the visitor straight to
 * `/account/login`. Landing on a guarded route with no session is what demonstrates the guard's
 * redirect for real, in the room, without needing a working login backend. (The Angular version
 * navigated to `/account/portal` itself afterwards so the router guard would run; here the guard is a
 * component watching the store, so the state change alone triggers it and a second navigation would
 * only race the guard's own `replace`.)
 */
export function PortalNav() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <nav aria-label="Account" className="flex flex-col gap-1">
      {SECTIONS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} className={cn(LINK_CLASS, active && ACTIVE_CLASS)}>
            {label}
          </Link>
        );
      })}

      <Button type="button" variant="ghost" size="sm" className="mt-4" onClick={logout}>
        Log out
      </Button>
    </nav>
  );
}
