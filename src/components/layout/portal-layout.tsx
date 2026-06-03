// Wires the providers + shell around a portal's pages. Used by each role
// layout after the server-side role guard resolves the user.

import { SessionProvider } from '@/features/auth/session-context';
import { AdminSessionProvider } from '@/features/auth/admin-session-context';
import { ToastProvider } from '@/components/ui/toast';
import { AppShell } from '@/components/layout/app-shell';
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
      <ToastProvider>
        <AppShell user={user}>{children}</AppShell>
      </ToastProvider>
    </SessionProvider>
  );

  if (user.role === 'admin') {
    return <AdminSessionProvider user={user}>{shell}</AdminSessionProvider>;
  }

  return shell;
}
