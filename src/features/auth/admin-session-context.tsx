'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  resolveActiveSchoolId,
  resolveSchoolCatalog,
  resolveSchoolIds,
} from '@/lib/auth/normalize-user';
import type { SchoolRef } from '@/types/api';
import type { CurrentUser } from '@/types/user';

interface AdminSessionValue {
  activeSchoolId: number | null;
  schools: SchoolRef[];
  requiresActiveSchool: boolean;
  switching: boolean;
  setActiveSchool: (schoolId: number) => Promise<boolean>;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function AdminSessionProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const schools = useMemo(() => {
    if (Array.isArray(user.schools) && user.schools.length > 0) {
      return user.schools;
    }
    return resolveSchoolCatalog(user);
  }, [user]);
  const schoolIds = useMemo(
    () => (schools.length ? schools.map((s) => s.id) : resolveSchoolIds(user)),
    [schools, user],
  );
  const requiresActiveSchool = schoolIds.length > 1;

  const resolvedActiveSchoolId = useMemo(
    () =>
      resolveActiveSchoolId(
        {
          active_school_id: user.active_school_id,
          default_school_id: user.default_school_id,
          school_ids: schoolIds,
          school: user.school,
          bindings: user.bindings,
          schools: user.schools,
        },
        null,
      ),
    [user, schoolIds],
  );

  const [activeSchoolId, setActiveSchoolId] = useState<number | null>(resolvedActiveSchoolId);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (resolvedActiveSchoolId == null) {
      if (activeSchoolId != null && !schoolIds.includes(activeSchoolId)) setActiveSchoolId(null);
      return;
    }
    if (activeSchoolId == null || !schoolIds.includes(activeSchoolId)) {
      setActiveSchoolId(resolvedActiveSchoolId);
    }
  }, [resolvedActiveSchoolId, activeSchoolId, schoolIds]);

  const setActiveSchool = useCallback(
    async (schoolId: number) => {
      setSwitching(true);
      try {
        const res = await fetch('/api/auth/active-school', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ school_id: schoolId }),
        });
        const body = (await res.json()) as { success?: boolean };
        if (!res.ok || !body.success) return false;
        setActiveSchoolId(schoolId);
        router.refresh();
        return true;
      } catch {
        return false;
      } finally {
        setSwitching(false);
      }
    },
    [router],
  );

  const value = useMemo(
    () => ({
      activeSchoolId,
      schools,
      requiresActiveSchool,
      switching,
      setActiveSchool,
    }),
    [activeSchoolId, schools, requiresActiveSchool, switching, setActiveSchool],
  );

  return (
    <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>
  );
}

export function useAdminSession(): AdminSessionValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    return {
      activeSchoolId: null,
      schools: [],
      requiresActiveSchool: false,
      switching: false,
      setActiveSchool: async () => false,
    };
  }
  return ctx;
}
