'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { parseFinanceQuickListResponse } from '@/lib/utils/finance-list-response';
import type { ApiErrorBody } from '@/types/api';
import type { FinanceInstallmentListSummary } from '@/types/finance';

export interface StudentInstallmentsSummaryState {
  loading: boolean;
  data: FinanceInstallmentListSummary | null;
  error: ApiErrorBody | null;
  reload: () => void;
}

export function useStudentInstallmentsSummary(
  studentId: number | string | null,
  academicYearId: number | string | null,
  enabled: boolean,
): StudentInstallmentsSummaryState {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FinanceInstallmentListSummary | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !studentId || !academicYearId) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const query: Record<string, string | number> = {
      student_id: Number(studentId),
      academic_year_id: Number(academicYearId),
      page: 1,
      page_size: 1,
    };
    if (activeSchoolId != null) query.active_school_id = activeSchoolId;

    api.get<unknown>(endpoints.admin.financeInstallments, query).then((res) => {
      if (!active) return;
      if (res.success) {
        const parsed = parseFinanceQuickListResponse(res.data);
        setData(parsed.summary);
        setError(parsed.summary ? null : { code: 'server_error', message: 'Missing installments summary.' });
      } else {
        setError(res.error);
        setData(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [studentId, academicYearId, activeSchoolId, enabled, nonce]);

  return { loading, data, error, reload };
}
