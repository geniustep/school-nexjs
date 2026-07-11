'use client';

import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { FeeType } from '@/types/finance';

/** Query contract for students-list service filter options. */
export const STUDENTS_LIST_FEE_TYPE_OPTIONS_QUERY = {
  page: 1,
  page_size: 100,
  active: 1,
  student_filter_visible: 1,
} as const;

/**
 * Fee-type options for the students list service filter.
 * Uses the students-filter visibility contract — not the full finance catalog.
 */
export function useStudentsListFeeTypeOptions(): {
  feeTypes: FeeType[];
  loading: boolean;
  reload: () => void;
} {
  const state = useAdminResource<FeeType[]>(
    endpoints.admin.financeFeeTypes,
    STUDENTS_LIST_FEE_TYPE_OPTIONS_QUERY,
  );
  return { feeTypes: state.data ?? [], loading: state.loading, reload: state.reload };
}
