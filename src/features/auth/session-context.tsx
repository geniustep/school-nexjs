'use client';

// Client-side session context. The authenticated user is resolved on the
// server (in each role layout) and passed down, so client components can read
// role/permissions/scope without re-fetching.

import { createContext, useContext } from 'react';
import type { CurrentUser } from '@/types/user';

const SessionContext = createContext<CurrentUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSession(): CurrentUser {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}
