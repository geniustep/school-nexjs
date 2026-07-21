'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setClientActiveRole } from '@/lib/auth/active-role-client';
import {
  listAvailableRoles,
  resolveConfirmedActiveRole,
  shouldShowRoleSwitcher,
  userOwnsRole,
} from '@/lib/auth/active-role-workspace';
import type { CurrentUser, UserRoleOption } from '@/types/user';

interface ActiveRoleContextValue {
  activeRole: string;
  availableRoles: UserRoleOption[];
  showSwitcher: boolean;
  switching: boolean;
  error: string | null;
  clearError: () => void;
  switchRole: (roleCode: string) => Promise<boolean>;
}

const ActiveRoleContext = createContext<ActiveRoleContextValue | null>(null);

export function ActiveRoleProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: ReactNode;
}) {
  const activeRole = resolveConfirmedActiveRole(user);
  const availableRoles = useMemo(() => listAvailableRoles(user), [user]);
  const showSwitcher = shouldShowRoleSwitcher(user);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setClientActiveRole(activeRole);
  }, [activeRole]);

  const clearError = useCallback(() => setError(null), []);

  const switchRole = useCallback(
    async (roleCode: string) => {
      const next = roleCode.trim().toLowerCase();
      if (!next || switching) return false;
      if (next === activeRole) return false;
      if (!userOwnsRole(user, next)) {
        setError('role_not_available');
        return false;
      }

      setSwitching(true);
      setError(null);
      try {
        const res = await fetch('/api/auth/active-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ active_role: next }),
        });
        const body = (await res.json().catch(() => null)) as {
          success?: boolean;
          data?: { home?: string; active_role?: string };
          error?: { code?: string; message?: string };
        } | null;

        if (!res.ok || !body?.success || !body.data?.active_role) {
          setError(body?.error?.code ?? 'role_switch_failed');
          return false;
        }

        if (body.data.active_role !== next) {
          setError('role_not_available');
          return false;
        }

        setClientActiveRole(body.data.active_role);
        const home = body.data.home || '/';
        // Full navigation clears prior-role client caches and RSC payload.
        window.location.assign(home);
        return true;
      } catch {
        setError('role_switch_failed');
        return false;
      } finally {
        setSwitching(false);
      }
    },
    [activeRole, switching, user],
  );

  const value = useMemo(
    () => ({
      activeRole,
      availableRoles,
      showSwitcher,
      switching,
      error,
      clearError,
      switchRole,
    }),
    [activeRole, availableRoles, showSwitcher, switching, error, clearError, switchRole],
  );

  return <ActiveRoleContext.Provider value={value}>{children}</ActiveRoleContext.Provider>;
}

export function useActiveRole(): ActiveRoleContextValue {
  const ctx = useContext(ActiveRoleContext);
  if (!ctx) {
    return {
      activeRole: 'admin',
      availableRoles: [],
      showSwitcher: false,
      switching: false,
      error: null,
      clearError: () => undefined,
      switchRole: async () => false,
    };
  }
  return ctx;
}
