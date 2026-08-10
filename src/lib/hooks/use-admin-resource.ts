'use client';

import { useMemo } from 'react';
import {
  useResource,
  type ResourceState,
  type UseResourceOptions,
} from '@/lib/hooks/use-resource';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ListParams } from '@/types/api';

function isAdminApiPath(path: string | null): boolean {
  return !!path && path.startsWith('/admin/');
}

function isDashboardAcademicYearScopedPath(path: string | null): boolean {
  return path === endpoints.admin.dashboard || path === endpoints.admin.executiveDashboard;
}

export function useAdminResource<T>(
  path: string | null,
  query?: ListParams,
  options?: UseResourceOptions,
): ResourceState<T> {
  const {
    activeSchoolId,
    requiresActiveSchool,
    schools,
    switching,
    activeAcademicYearId,
    academicYearError,
  } = useAdminSession();
  const allowedSchoolIds = useMemo(() => schools.map((s) => s.id), [schools]);
  const safeActiveSchoolId =
    activeSchoolId != null && allowedSchoolIds.includes(activeSchoolId) ? activeSchoolId : null;

  const mergedQuery = useMemo(() => {
    if (!isAdminApiPath(path) || safeActiveSchoolId == null) return query;
    return {
      ...query,
      active_school_id: safeActiveSchoolId,
      ...(isDashboardAcademicYearScopedPath(path) && activeAcademicYearId != null
        ? { academic_year_id: activeAcademicYearId }
        : {}),
    };
  }, [path, query, safeActiveSchoolId, activeAcademicYearId]);

  const pendingActiveSchool =
    !!path && isAdminApiPath(path) && requiresActiveSchool && safeActiveSchoolId == null;

  // Both dashboard endpoints are strict Academic Year consumers. Do not issue an
  // unscoped request while the global year context is still resolving, otherwise
  // a remembered historical selection can briefly render the canonical current year.
  const missingDashboardAcademicYear =
    !!path &&
    isDashboardAcademicYearScopedPath(path) &&
    safeActiveSchoolId != null &&
    activeAcademicYearId == null;
  const pendingDashboardAcademicYear =
    missingDashboardAcademicYear && academicYearError == null;

  const effectivePath =
    pendingActiveSchool || missingDashboardAcademicYear ? null : path;

  const state = useResource<T>(effectivePath, mergedQuery, options);

  return useMemo(() => {
    const waiting = pendingActiveSchool || pendingDashboardAcademicYear || switching;
    const loading = state.loading || waiting;
    return {
      ...state,
      loading,
      initialLoading: loading && state.data === null,
      fetching: state.fetching && !waiting,
    };
  }, [pendingActiveSchool, pendingDashboardAcademicYear, switching, state]);
}
