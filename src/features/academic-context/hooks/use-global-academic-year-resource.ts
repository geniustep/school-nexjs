'use client';

import { useMemo } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { ResourceState, UseResourceOptions } from '@/lib/hooks/use-resource';
import type { ListParams } from '@/types/api';
import { buildGlobalAcademicYearQuery } from '../utils/global-academic-year-query';

/**
 * Explicit opt-in wrapper for operational reads whose Odoo contract is proven
 * Academic-Year aware. Detail, RBAC, generic options, transaction-history and
 * other endpoints must keep using useAdminResource directly unless their own
 * contract is audited.
 */
export function useGlobalAcademicYearResource<T>(
  path: string | null,
  query?: ListParams,
  options?: UseResourceOptions,
): ResourceState<T> {
  const { activeAcademicYearId, academicYearError } = useAdminSession();
  const missingAcademicYear = !!path && activeAcademicYearId == null;
  const pendingAcademicYear = missingAcademicYear && academicYearError == null;

  const scopedQuery = useMemo(
    () => buildGlobalAcademicYearQuery(query, activeAcademicYearId),
    [query, activeAcademicYearId],
  );

  const state = useAdminResource<T>(
    missingAcademicYear ? null : path,
    scopedQuery,
    options,
  );

  return useMemo(() => {
    const loading = state.loading || pendingAcademicYear;
    return {
      ...state,
      loading,
      initialLoading: loading && state.data === null,
      fetching: state.fetching && !pendingAcademicYear,
      error: state.error ?? academicYearError,
    };
  }, [state, pendingAcademicYear, academicYearError]);
}
