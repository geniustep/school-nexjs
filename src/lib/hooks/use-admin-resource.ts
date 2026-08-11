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

/** Exact allowlist only: do not broaden this to all /admin routes. */
function isStrictGlobalAcademicYearScopedPath(path: string | null): boolean {
  return (
    path === endpoints.admin.dashboard ||
    path === endpoints.admin.executiveDashboard ||
    // Admissions list/dashboard share the same Odoo year-aware base resolver.
    path === endpoints.admin.admissions ||
    path === endpoints.admin.admissionsDashboard ||
    // Gradebook list is annual operational data. Detail/results stay entity-scoped
    // through gradebook_id and must not receive blind academic-year injection.
    path === endpoints.admin.gradebooks ||
    // Weekly/structural timetable list; dated occurrences use different endpoints
    // and remain date-primary.
    path === endpoints.admin.timetable
  );
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
      ...(isStrictGlobalAcademicYearScopedPath(path) && activeAcademicYearId != null
        ? { academic_year_id: activeAcademicYearId }
        : {}),
    };
  }, [path, query, safeActiveSchoolId, activeAcademicYearId]);

  const pendingActiveSchool =
    !!path && isAdminApiPath(path) && requiresActiveSchool && safeActiveSchoolId == null;

  // Strict global-year consumers must not issue an unscoped request while the
  // remembered/header year is still resolving. This prevents a historical
  // selection from briefly rendering the canonical current year.
  const missingStrictAcademicYear =
    !!path &&
    isStrictGlobalAcademicYearScopedPath(path) &&
    safeActiveSchoolId != null &&
    activeAcademicYearId == null;
  const pendingStrictAcademicYear = missingStrictAcademicYear && academicYearError == null;

  const effectivePath =
    pendingActiveSchool || missingStrictAcademicYear ? null : path;

  const state = useResource<T>(effectivePath, mergedQuery, options);

  return useMemo(() => {
    const waiting = pendingActiveSchool || pendingStrictAcademicYear || switching;
    const loading = state.loading || waiting;
    return {
      ...state,
      loading,
      initialLoading: loading && state.data === null,
      fetching: state.fetching && !waiting,
    };
  }, [pendingActiveSchool, pendingStrictAcademicYear, switching, state]);
}
