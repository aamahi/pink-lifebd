import type { ReactNode } from 'react';
import { AuthGuard } from '@/features/account/portal/auth.guard';
import { PortalShell } from '@/features/account/portal/portal-shell/portal-shell';

/**
 * The guard sits on the shell, once for the whole `/account/portal` group, rather than on each child
 * page -- every child inherits its result instead of five copies of the same check re-running on
 * every in-portal navigation.
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <PortalShell>{children}</PortalShell>
    </AuthGuard>
  );
}
