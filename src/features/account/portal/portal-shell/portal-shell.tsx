import type { ReactNode } from 'react';
import { PortalNav } from '../portal-nav/portal-nav';

/**
 * Account portal shell -- `PortalNav` plus the active child page (`dashboard`, `orders`,
 * `orders/[id]`, `profile`, `addresses`) as `children`. `AuthGuard` wraps this in
 * `app/account/portal/layout.tsx`, one level above this component, so this file itself has nothing
 * to check: by the time it renders, the guard has already let the visitor through.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <section className="page-shell grid gap-8 py-10 sm:grid-cols-[12rem_1fr]">
      <PortalNav />
      <div>{children}</div>
    </section>
  );
}
