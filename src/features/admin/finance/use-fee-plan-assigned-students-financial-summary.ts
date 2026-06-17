'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeAssignedStudentsFinancialSummary } from '@/features/admin/finance/utils/normalize-assigned-students-financial-summary';
import type { ApiErrorBody } from '@/types/api';
import type { AssignedStudentsFinancialSummaryResponse } from '@/types/student-financial-overview';

export interface FeePlanAssignedStudentsFinancialSummaryState {
  loading: boolean;
  data: AssignedStudentsFinancialSummaryResponse | null;
  error: ApiErrorBody | null;
  reload: () => void;
}

export function useFeePlanAssignedStudentsFinancialSummary(
  planId: number | string | null,
  query: Record<string, string | number> | null,
  enabled: boolean,
): FeePlanAssignedStudentsFinancialSummaryState {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AssignedStudentsFinancialSummaryResponse | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !planId || !query) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const params: Record<string, string | number> = { ...query };
    if (activeSchoolId != null) params.active_school_id = activeSchoolId;

    api
      .get<unknown>(endpoints.admin.financeFeePlanAssignedStudentsFinancialSummary(planId), params)
      .then((res) => {
        if (!active) return;
        if (res.success) {
          const normalized = normalizeAssignedStudentsFinancialSummary(res.data);
          if (normalized) {
            setData(normalized);
            setError(null);
          } else {
            setData(null);
            setError({ code: 'server_error', message: 'Unexpected assigned students summary shape.' });
          }
        } else {
          setError(res.error);
          setData(null);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [planId, activeSchoolId, enabled, nonce, query]);

  return { loading, data, error, reload };
}

export function buildAssignedStudentsFinancialSummaryQuery(input: {
  search?: string;
  levelId?: string;
  classId?: string;
  page: number;
  pageSize: number;
  academicYearId?: number | string;
}): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: input.page,
    page_size: input.pageSize,
  };
  if (input.search?.trim()) query.search = input.search.trim();
  if (input.levelId) query.level_id = Number(input.levelId);
  if (input.classId) query.class_id = Number(input.classId);
  if (input.academicYearId) query.academic_year_id = Number(input.academicYearId);
  return query;
}
