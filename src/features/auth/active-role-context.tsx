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
import { ActiveContextSwitchError, switchActiveContext } from '@/lib/auth/active-context-client';
import {
  confirmedActiveContext,
  hasContextContract,
  listAvailableContexts,
  shouldShowContextSwitcher,
} from '@/lib/auth/active-context-workspace';
import {
  listAvailableRoles,
  resolveConfirmedActiveRole,
  shouldShowRoleSwitcher,
  userOwnsRole,
} from '@/lib/auth/active-role-workspace';
import type { ActiveUserContext, CurrentUser, UserRoleContext, UserRoleOption } from '@/types/user';

interface ActiveRoleContextValue {
  activeRole: string;
  availableRoles: UserRoleOption[];
  activeContext: ActiveUserContext | null;
  availableContexts: UserRoleContext[];
  contextMode: boolean;
  showSwitcher: boolean;
  switching: boolean;
  error: string | null;
  clearError: () => void;
  switchRole: (roleCode: string) => Promise<boolean>;
  switchContext: (context: ActiveUserContext) => Promise<boolean>;
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
  const activeContext = confirmedActiveContext(user);
  const availableContexts = useMemo(() => listAvailableContexts(user), [user]);
  const contextMode = hasContextContract(user);
  const showSwitcher = contextMode ? shouldShowContextSwitcher(user) : shouldShowRoleSwitcher(user);
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

  const switchContext = useCallback(
    async (context: ActiveUserContext) => {
      if (switching) return false;
      if (
        activeContext?.school_id === context.school_id &&
        activeContext.role === context.role
      ) return false;

      setSwitching(true);
      setError(null);
      try {
        const result = await switchActiveContext(context);
        const confirmed = result.user.active_context;
        if (
          !confirmed ||
          confirmed.school_id !== context.school_id ||
          confirmed.role !== context.role
        ) {
          setError('context_not_confirmed');
          return false;
        }
        setClientActiveRole(result.user.active_role ?? confirmed.role);
        window.location.assign(result.home);
        return true;
      } catch (err) {
        setError(err instanceof ActiveContextSwitchError ? err.code : 'context_switch_failed');
        return false;
      } finally {
        setSwitching(false);
      }
    },
    [activeContext, switching],
  );

  const value = useMemo(
    () => ({
      activeRole,
      availableRoles,
      activeContext,
      availableContexts,
      contextMode,
      showSwitcher,
      switching,
      error,
      clearError,
      switchRole,
      switchContext,
    }),
    [
      activeRole,
      availableRoles,
      activeContext,
      availableContexts,
      contextMode,
      showSwitcher,
      switching,
      error,
      clearError,
      switchRole,
      switchContext,
    ],
  );

  return <ActiveRoleContext.Provider value={value}>{children}</ActiveRoleContext.Provider>;
}

export function useActiveRole(): ActiveRoleContextValue {
  const ctx = useContext(ActiveRoleContext);
  if (!ctx) {
    return {
      activeRole: 'admin',
      availableRoles: [],
      activeContext: null,
      availableContexts: [],
      contextMode: false,
      showSwitcher: false,
      switching: false,
      error: null,
      clearError: () => undefined,
      switchRole: async () => false,
      switchContext: async () => false,
    };
  }
  return ctx;
}
