// Wires the providers + shell around a portal's pages. Used by each role
// layout after the server-side role guard resolves the user.

import { SessionProvider } from '@/features/auth/session-context';
import { AdminSessionProvider } from '@/features/auth/admin-session-context';
import { ActiveRoleProvider } from '@/features/auth/active-role-context';
import { ToastProvider } from '@/components/ui/toast';
import { AppShell } from '@/components/layout/app-shell';
import { MobileNavCoordinatorProvider } from '@/hooks/mobile-nav-coordinator';
import { resolveEffectiveRole } from '@/lib/auth/active-role-workspace';
import type { CurrentUser } from '@/types/user';

export function PortalLayout({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const shell = (
    <SessionProvider user={user}>
      <ActiveRoleProvider user={user}>
        <ToastProvider>
          <MobileNavCoordinatorProvider>
            <AppShell user={user}>{children}</AppShell>
          </MobileNavCoordinatorProvider>
        </ToastProvider>
      </ActiveRoleProvider>
    </SessionProvider>
  );

  if (resolveEffectiveRole(user) === 'admin') {
    return <AdminSessionProvider user={user}>{shell}</AdminSessionProvider>;
  }

  return shell;
}
