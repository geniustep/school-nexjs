'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { buildGlobalAcademicYearQuery } from '@/features/academic-context/utils/global-academic-year-query';
import type { ResourceState } from '@/lib/hooks/use-resource';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody, ApiMeta } from '@/types/api';
import type { Level } from '@/types/class';
import type { Student } from '@/types/student';
import {
  STUDENTS_LIST_API_PAGE_SIZE_CAP,
  collectCycleLevelIds,
  mergeStudentsById,
  paginateStudentsListClient,
  studentsListUsesClientCycleFilter,
} from '../utils/students-list-cycle-filter';
import { studentsListToApiParams, type StudentsListFilterValues } from '../utils/students-list-url';
import { buildStudentsListQueryParams } from '../utils/student-search-query';

async function fetchAllStudentsForLevel(
  levelId: number,
  filters: StudentsListFilterValues,
  activeSchoolId: number | null | undefined,
  activeAcademicYearId: number,
): Promise<Student[]> {
  const base = buildStudentsListQueryParams({
    search: filters.search,
    classId: filters.classId,
    levelId: String(levelId),
    statusFilter: filters.statusFilter,
    accountFilter: filters.accountFilter,
    serviceId: filters.serviceId,
    servicePresence: filters.servicePresence,
    page: 1,
  });

  const collected: Student[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const res = await api.get<Student[]>(
      endpoints.admin.students,
      buildGlobalAcademicYearQuery(
        {
          ...base,
          page,
          page_size: STUDENTS_LIST_API_PAGE_SIZE_CAP,
          active_school_id: activeSchoolId ?? undefined,
        },
        activeAcademicYearId,
      ),
    );
    if (!res.success) {
      throw new Error(res.error?.message ?? 'students_cycle_fetch_failed');
    }
    const chunk = Array.isArray(res.data) ? res.data : [];
    collected.push(...chunk);
    totalPages = Math.max(1, res.meta?.pagination?.total_pages ?? 1);
    page += 1;
  } while (page <= totalPages);

  return collected;
}

/**
 * Students list data source.
 * Server path for normal filters; per-level merge when cycle is selected without level.
 */
export function useStudentsListResource(
  filters: StudentsListFilterValues,
  levels: Level[] | null,
  levelsLoading: boolean,
): ResourceState<Student[]> {
  const {
    activeSchoolId,
    requiresActiveSchool,
    schools,
    switching,
    activeAcademicYearId,
    academicYearError,
    schoolViewMode,
  } = useAdminSession();
  const allowedSchoolIds = useMemo(() => schools.map((s) => s.id), [schools]);
  const safeActiveSchoolId =
    activeSchoolId != null && allowedSchoolIds.includes(activeSchoolId) ? activeSchoolId : null;
  const pendingActiveSchool = requiresActiveSchool && safeActiveSchoolId == null;
  const missingAcademicYear = safeActiveSchoolId != null && activeAcademicYearId == null;
  const pendingAcademicYear = missingAcademicYear && academicYearError == null;

  const allSchoolsMode = schoolViewMode === 'all';
  const clientCycle = !allSchoolsMode && studentsListUsesClientCycleFilter(filters);
  const cycleLevelIds = useMemo(
    () => (clientCycle ? collectCycleLevelIds(levels ?? [], filters.cycleCode) : []),
    [clientCycle, levels, filters.cycleCode],
  );

  const serverParams = useMemo(
    () => (clientCycle ? undefined : studentsListToApiParams(filters)),
    [clientCycle, filters],
  );
  const serverState = useGlobalAcademicYearResource<Student[]>(
    clientCycle || pendingActiveSchool || allSchoolsMode ? null : endpoints.admin.students,
    serverParams,
  );
  const allSchoolsState = useAdminResource<Student[]>(
    allSchoolsMode ? endpoints.admin.allSchoolsStudents : null,
    allSchoolsMode ? { page: filters.page, page_size: 50, search: filters.search || undefined, state: filters.statusFilter || undefined } : undefined,
  );

  const [clientLoading, setClientLoading] = useState(false);
  const [mergedRows, setMergedRows] = useState<Student[] | null>(null);
  const [clientError, setClientError] = useState<ApiErrorBody | null>(null);
  const [clientNonce, setClientNonce] = useState(0);

  /** Fetch inputs only — page changes paginate locally without refetch. */
  const clientFetchKey = useMemo(
    () =>
      JSON.stringify({
        cycleCode: filters.cycleCode,
        search: filters.search,
        classId: filters.classId,
        statusFilter: filters.statusFilter,
        accountFilter: filters.accountFilter,
        serviceId: filters.serviceId,
        servicePresence: filters.servicePresence,
        levelIds: cycleLevelIds,
        schoolId: safeActiveSchoolId,
        academicYearId: activeAcademicYearId,
        nonce: clientNonce,
      }),
    [
      filters.cycleCode,
      filters.search,
      filters.classId,
      filters.statusFilter,
      filters.accountFilter,
      filters.serviceId,
      filters.servicePresence,
      cycleLevelIds,
      safeActiveSchoolId,
      activeAcademicYearId,
      clientNonce,
    ],
  );

  useEffect(() => {
    if (!clientCycle || pendingActiveSchool || missingAcademicYear) return;
    if (levelsLoading || activeAcademicYearId == null) return;

    let active = true;
    setClientLoading(true);
    setClientError(null);

    if (cycleLevelIds.length === 0) {
      if (!active) return;
      setMergedRows([]);
      setClientLoading(false);
      return;
    }

    (async () => {
      try {
        const groups = await Promise.all(
          cycleLevelIds.map((levelId) =>
            fetchAllStudentsForLevel(
              levelId,
              filters,
              safeActiveSchoolId,
              activeAcademicYearId,
            ),
          ),
        );
        if (!active) return;
        setMergedRows(mergeStudentsById(groups));
        setClientError(null);
      } catch {
        if (!active) return;
        setClientError({
          code: 'server_error',
          message: 'students_cycle_fetch_failed',
        });
        setMergedRows((prev) => prev);
      } finally {
        if (active) setClientLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // clientFetchKey captures filter/level/school/year inputs (page excluded).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientCycle, pendingActiveSchool, missingAcademicYear, levelsLoading, clientFetchKey]);

  const clientPage = useMemo(() => {
    if (mergedRows == null) {
      return { rows: null as Student[] | null, meta: null as ApiMeta | null };
    }
    const { rows, pagination } = paginateStudentsListClient(mergedRows, filters.page);
    return { rows, meta: { pagination } satisfies ApiMeta };
  }, [mergedRows, filters.page]);

  const reloadClient = useCallback(() => setClientNonce((n) => n + 1), []);

  if (allSchoolsMode) {
    return allSchoolsState;
  }

  if (!clientCycle) {
    const waiting = pendingActiveSchool || switching;
    return {
      ...serverState,
      loading: serverState.loading || waiting,
      initialLoading: (serverState.loading || waiting) && serverState.data === null,
      fetching: serverState.fetching && !waiting,
      reload: serverState.reload,
    };
  }

  const waiting = pendingActiveSchool || pendingAcademicYear || switching || levelsLoading;
  const loading = clientLoading || waiting;

  return {
    loading,
    initialLoading: loading && clientPage.rows === null,
    fetching: loading && clientPage.rows !== null,
    data: clientPage.rows,
    meta: clientPage.meta,
    error: clientError ?? academicYearError,
    reload: reloadClient,
  };
}
