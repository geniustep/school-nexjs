'use client';

import { useMemo } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody, ApiMeta } from '@/types/api';
import {
  buildStudentsFinancialServiceCountsParams,
  normalizeFinancialServiceCountsData,
  readTotalStudentsFromMeta,
  type StudentsFinancialServiceCountItem,
  type StudentsFinancialServiceCountsData,
} from '../utils/students-financial-service-counts';
import type { StudentsListFilterValues } from '../utils/students-list-url';

export type StudentsFinancialServiceCountsState = {
  initialLoading: boolean;
  fetching: boolean;
  items: StudentsFinancialServiceCountItem[];
  totalStudents: number;
  error: ApiErrorBody | null;
  reload: () => void;
};

/**
 * Counts for financial-service cards on the students list.
 * Uses the same academic filters as the list request (no parallel state).
 */
export function useStudentsFinancialServiceCounts(
  filters: Pick<StudentsListFilterValues, 'statusFilter' | 'levelId' | 'classId'>,
): StudentsFinancialServiceCountsState {
  const params = useMemo(
    () => buildStudentsFinancialServiceCountsParams(filters),
    [filters.statusFilter, filters.levelId, filters.classId],
  );

  const state = useAdminResource<StudentsFinancialServiceCountsData>(
    endpoints.admin.studentsFinancialServiceCounts,
    params,
  );

  const items = useMemo(() => {
    if (state.data == null) return [];
    return normalizeFinancialServiceCountsData(state.data).items;
  }, [state.data]);

  const totalStudents = useMemo(
    () => readTotalStudentsFromMeta(state.meta as ApiMeta | null),
    [state.meta],
  );

  return {
    initialLoading: state.initialLoading,
    fetching: state.fetching,
    items,
    totalStudents,
    error: state.error,
    reload: state.reload,
  };
}
