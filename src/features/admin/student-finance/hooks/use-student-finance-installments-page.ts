'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { parseFinanceQuickListResponse } from '@/lib/utils/finance-list-response';
import type { ApiErrorBody } from '@/types/api';
import type { FinanceInstallmentListSummary } from '@/types/finance';
import type { StudentInstallment } from '../types';

export interface StudentFinanceInstallmentsPageState {
  loading: boolean;
  initialLoading: boolean;
  data: StudentInstallment[];
  summary: FinanceInstallmentListSummary | null;
  error: ApiErrorBody | null;
  reload: () => void;
}

export function useStudentFinanceInstallmentsPage(
  studentId: number | string | null,
  query: Record<string, string | number | undefined> | null,
  enabled: boolean,
  refreshSignal = 0,
): StudentFinanceInstallmentsPageState {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [data, setData] = useState<StudentInstallment[]>([]);
  const [summary, setSummary] = useState<FinanceInstallmentListSummary | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !studentId || !query?.academic_year_id) {
      setLoading(false);
      setInitialLoading(false);
      setData([]);
      setSummary(null);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    if (data.length === 0) setInitialLoading(true);
    setError(null);

    const params: Record<string, string | number> = {
      student_id: Number(studentId),
      ...query,
    };
    if (activeSchoolId != null) params.active_school_id = activeSchoolId;

    api.get<unknown>(endpoints.admin.financeInstallments, params).then((res) => {
      if (!active) return;
      if (res.success) {
        const parsed = parseFinanceQuickListResponse<StudentInstallment>(res.data);
        setData(parsed.items);
        setSummary(parsed.summary);
        setError(null);
      } else {
        setError(res.error);
        setData([]);
        setSummary(null);
      }
      setLoading(false);
      setInitialLoading(false);
    });

    return () => {
      active = false;
    };
  }, [studentId, query, activeSchoolId, enabled, nonce, refreshSignal]);

  return { loading, initialLoading, data, summary, error, reload };
}
