'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeAcademicContextOptions } from '@/features/academic-context/utils/normalize-academic-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  resolveActiveSchoolId,
  resolveSchoolCatalog,
  resolveSchoolIds,
} from '@/lib/auth/normalize-user';
import type { SchoolRef } from '@/types/api';
import type { AcademicYearOption } from '@/types/academic-context';
import type { CurrentUser } from '@/types/user';

type AcademicYearContextError = { code: string; message: string };

interface AdminSessionValue {
  activeSchoolId: number | null;
  schools: SchoolRef[];
  requiresActiveSchool: boolean;
  switching: boolean;
  setActiveSchool: (schoolId: number) => Promise<boolean>;
  activeAcademicYearId: number | null;
  academicYears: AcademicYearOption[];
  academicYearLoading: boolean;
  academicYearError: AcademicYearContextError | null;
  setActiveAcademicYear: (academicYearId: number) => boolean;
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
  const [activeAcademicYearId, setActiveAcademicYearId] = useState<number | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [academicYearLoading, setAcademicYearLoading] = useState(false);
  const [academicYearError, setAcademicYearError] = useState<AcademicYearContextError | null>(null);

  useEffect(() => {
    if (resolvedActiveSchoolId == null) {
      if (activeSchoolId != null && !schoolIds.includes(activeSchoolId)) setActiveSchoolId(null);
      return;
    }
    if (activeSchoolId == null || !schoolIds.includes(activeSchoolId)) {
      setActiveSchoolId(resolvedActiveSchoolId);
    }
  }, [resolvedActiveSchoolId, activeSchoolId, schoolIds]);

  useEffect(() => {
    if (activeSchoolId == null) {
      setActiveAcademicYearId(null);
      setAcademicYears([]);
      setAcademicYearError(null);
      setAcademicYearLoading(false);
      return;
    }

    let cancelled = false;
    setAcademicYearLoading(true);
    setAcademicYearError(null);
    setActiveAcademicYearId(null);
    setAcademicYears([]);

    void api.get<unknown>(endpoints.admin.academicContextOptions).then((res) => {
      if (cancelled) return;

      if (!res.success) {
        setAcademicYearError({ code: res.error.code, message: res.error.message });
        setAcademicYearLoading(false);
        return;
      }

      const data = normalizeAcademicContextOptions(res.data);
      const years = data.academic_years ?? [];
      const currentId =
        data.selected_context?.academic_year_id ??
        data.applied_filters?.academic_year_id ??
        null;
      setAcademicYears(years);

      if (currentId == null) {
        setAcademicYearError({
          code: 'academic_year_current_missing',
          message: 'No current academic year is configured for the active school.',
        });
        setAcademicYearLoading(false);
        return;
      }

      if (!years.some((year) => year.id === currentId)) {
        setAcademicYearError({
          code: 'academic_year_current_integrity_error',
          message: 'The current academic year is not available in the active school context.',
        });
        setAcademicYearLoading(false);
        return;
      }

      setActiveAcademicYearId(currentId);
      setAcademicYearLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeSchoolId]);

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
        setActiveAcademicYearId(null);
        setAcademicYears([]);
        setAcademicYearError(null);
        setAcademicYearLoading(true);
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

  const setActiveAcademicYear = useCallback(
    (academicYearId: number) => {
      if (!academicYears.some((year) => year.id === academicYearId)) return false;
      if (academicYearId === activeAcademicYearId) return true;
      setActiveAcademicYearId(academicYearId);
      setAcademicYearError(null);
      router.refresh();
      return true;
    },
    [academicYears, activeAcademicYearId, router],
  );

  const value = useMemo(
    () => ({
      activeSchoolId,
      schools,
      requiresActiveSchool,
      switching,
      setActiveSchool,
      activeAcademicYearId,
      academicYears,
      academicYearLoading,
      academicYearError,
      setActiveAcademicYear,
    }),
    [
      activeSchoolId,
      schools,
      requiresActiveSchool,
      switching,
      setActiveSchool,
      activeAcademicYearId,
      academicYears,
      academicYearLoading,
      academicYearError,
      setActiveAcademicYear,
    ],
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
      activeAcademicYearId: null,
      academicYears: [],
      academicYearLoading: false,
      academicYearError: null,
      setActiveAcademicYear: () => false,
    };
  }
  return ctx;
}
