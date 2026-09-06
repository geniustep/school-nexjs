'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  useResource,
  type ResourceState,
  type UseResourceOptions,
} from '@/lib/hooks/use-resource';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { ALL_SCHOOLS_ENDPOINTS } from '@/features/admin/all-schools/all-schools-contract';
import { isAllSchoolsReadMode } from '@/lib/admin/all-schools-read-mode';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiMeta, ListParams } from '@/types/api';

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

function allSchoolsPath(path: string | null): string | null {
  if (path === endpoints.admin.dashboard) return ALL_SCHOOLS_ENDPOINTS.dashboard;
  if (path === endpoints.admin.students) return ALL_SCHOOLS_ENDPOINTS.students;
  if (path === endpoints.admin.classes) return ALL_SCHOOLS_ENDPOINTS.classes;
  if (path === endpoints.admin.parents) return ALL_SCHOOLS_ENDPOINTS.parents;
  if (
    path === ALL_SCHOOLS_ENDPOINTS.dashboard ||
    path === ALL_SCHOOLS_ENDPOINTS.students ||
    path === ALL_SCHOOLS_ENDPOINTS.classes ||
    path === ALL_SCHOOLS_ENDPOINTS.parents
  ) {
    return path;
  }
  return null;
}

function shouldBlockSingleSchoolRead(
  pathname: string | null,
  originalPath: string | null,
  mappedPath: string | null,
): boolean {
  if (!originalPath || !isAdminApiPath(originalPath) || mappedPath) return false;

  // All-Schools is a read scope, not permission to surface data from the currently
  // active school inside otherwise aggregate pages. Keep only reference data that
  // the canonical Students / Classes render trees need to preserve their structure.
  if (pathname === '/admin/dashboard') return true;
  if (pathname === '/admin/students') return originalPath !== endpoints.admin.levels;
  if (pathname === '/admin/classes') return originalPath !== endpoints.admin.levels;
  if (pathname === '/admin/parents') return true;
  return false;
}

function normalizeAllSchoolsQuery(
  mappedPath: string,
  query: ListParams | undefined,
): ListParams | undefined {
  if (!query) return undefined;
  const next: ListParams = { ...query };
  delete next.active_school_id;
  delete next.academic_year_id;

  if (mappedPath === ALL_SCHOOLS_ENDPOINTS.students) {
    if (next.status != null && next.state == null) {
      next.state = next.status;
    }
    delete next.status;
    delete next.service_id;
    delete next.service_group_id;
    delete next.service_presence;
  }

  return next;
}

function dashboardSummary<T>(
  data: unknown,
  meta: ApiMeta | null,
): { data: T | null; meta: ApiMeta | null } {
  if (!data || typeof data !== 'object') return { data: null, meta };
  const record = data as Record<string, unknown>;
  const summary = record.summary;
  if (!summary || typeof summary !== 'object') return { data: null, meta };
  const schools = Array.isArray(record.schools) ? record.schools : undefined;
  return {
    data: summary as T,
    meta: schools ? { ...(meta ?? {}), schools } : meta,
  };
}

export function useAdminResource<T>(
  path: string | null,
  query?: ListParams,
  options?: UseResourceOptions,
): ResourceState<T> {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const allSchools = isAllSchoolsReadMode(pathname, searchParams);
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

  const mappedAllSchoolsPath = allSchools ? allSchoolsPath(path) : null;
  const blockSingleSchoolRead =
    allSchools && shouldBlockSingleSchoolRead(pathname, path, mappedAllSchoolsPath);
  const requestPath = mappedAllSchoolsPath ?? path;

  const mergedQuery = useMemo(() => {
    if (mappedAllSchoolsPath) {
      return normalizeAllSchoolsQuery(mappedAllSchoolsPath, query);
    }
    if (!isAdminApiPath(path) || safeActiveSchoolId == null) return query;
    return {
      ...query,
      active_school_id: safeActiveSchoolId,
      ...(isStrictGlobalAcademicYearScopedPath(path) && activeAcademicYearId != null
        ? { academic_year_id: activeAcademicYearId }
        : {}),
    };
  }, [mappedAllSchoolsPath, path, query, safeActiveSchoolId, activeAcademicYearId]);

  const pendingActiveSchool =
    !allSchools &&
    !!path &&
    isAdminApiPath(path) &&
    requiresActiveSchool &&
    safeActiveSchoolId == null;

  // Strict global-year consumers must not issue an unscoped request while the
  // remembered/header year is still resolving. All-Schools resolves the current
  // operational year independently for each authorized school in Odoo.
  const missingStrictAcademicYear =
    !allSchools &&
    !!path &&
    isStrictGlobalAcademicYearScopedPath(path) &&
    safeActiveSchoolId != null &&
    activeAcademicYearId == null;
  const pendingStrictAcademicYear = missingStrictAcademicYear && academicYearError == null;

  const effectivePath =
    pendingActiveSchool || missingStrictAcademicYear || blockSingleSchoolRead
      ? null
      : requestPath;

  const rawState = useResource<unknown>(effectivePath, mergedQuery, options);

  return useMemo(() => {
    const waiting = pendingActiveSchool || pendingStrictAcademicYear || switching;
    const loading = rawState.loading || waiting;
    const normalized =
      mappedAllSchoolsPath === ALL_SCHOOLS_ENDPOINTS.dashboard
        ? dashboardSummary<T>(rawState.data, rawState.meta)
        : { data: rawState.data as T | null, meta: rawState.meta };

    return {
      ...rawState,
      data: normalized.data,
      meta: normalized.meta,
      loading,
      initialLoading: loading && normalized.data === null,
      fetching: rawState.fetching && !waiting,
    } as ResourceState<T>;
  }, [
    mappedAllSchoolsPath,
    pendingActiveSchool,
    pendingStrictAcademicYear,
    switching,
    rawState,
  ]);
}
