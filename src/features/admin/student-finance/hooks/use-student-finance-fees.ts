'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody, ListParams } from '@/types/api';
import type { StudentFee } from '@/types/finance';

export interface StudentFinanceFeesState {
  loading: boolean;
  initialLoading: boolean;
  data: StudentFee[];
  error: ApiErrorBody | null;
  reload: () => void;
}

export function useStudentFinanceFees(
  studentId: number | string | null,
  query: ListParams | null,
  enabled: boolean,
): StudentFinanceFeesState {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [data, setData] = useState<StudentFee[]>([]);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !studentId || !query?.academic_year_id) {
      setLoading(false);
      setInitialLoading(false);
      setData([]);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    if (data.length === 0) setInitialLoading(true);
    setError(null);

    const params: Record<string, string | number> = {};
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value != null && value !== '') params[key] = value;
      }
    }
    if (activeSchoolId != null) params.active_school_id = activeSchoolId;

    api.get<unknown>(endpoints.admin.financeStudentFeesForStudent(studentId), params).then((res) => {
      if (!active) return;
      if (res.success) {
        setData(Array.isArray(res.data) ? res.data : []);
        setError(null);
      } else {
        setError(res.error);
        setData([]);
      }
      setLoading(false);
      setInitialLoading(false);
    });

    return () => {
      active = false;
    };
  }, [studentId, query, activeSchoolId, enabled, nonce]);

  return { loading, initialLoading, data, error, reload };
}
