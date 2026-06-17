'use client';

import { useMemo } from 'react';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { normalizeFeePlanEligibleStudentsResponse } from '@/lib/utils/fee-plan-eligible-students-normalize';
import type { ListParams } from '@/types/api';
import type {
  FeePlanEligibleStudentsQuery,
  FeePlanEligibleStudentsResponse,
  FeePlanEligibilityTabStatus,
} from '@/types/fee-plan-eligible-students';

export function buildFeePlanEligibleStudentsQuery(input: {
  tab: FeePlanEligibilityTabStatus;
  search?: string;
  levelId?: string;
  classId?: string;
  page?: number;
  pageSize?: number;
}): FeePlanEligibleStudentsQuery {
  return {
    eligibility_status: input.tab,
    search: input.search?.trim() || undefined,
    level_id: input.levelId ? Number(input.levelId) : undefined,
    class_id: input.classId ? Number(input.classId) : undefined,
    page: input.page ?? 1,
    page_size: input.pageSize ?? 25,
  };
}

export function useFeePlanEligibleStudents(
  planId: number | null | undefined,
  query: FeePlanEligibleStudentsQuery,
  enabled = true,
) {
  const path =
    enabled && planId != null && planId > 0
      ? endpoints.admin.financeFeePlanEligibleStudents(planId)
      : null;

  const state = useAdminResource<unknown>(path, query as ListParams);

  const data = useMemo(
    () => (state.data != null ? normalizeFeePlanEligibleStudentsResponse(state.data) : null),
    [state.data],
  );

  return {
    ...state,
    data: data as FeePlanEligibleStudentsResponse | null,
  };
}
