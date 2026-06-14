'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody } from '@/types/api';
import type { StudentFinanceSummaryData } from '@/types/student-finance';
import { normalizeStudentFinanceSummaryResponse } from '../utils/normalize-student-finance';

export interface StudentFinanceSummaryState {
  loading: boolean;
  data: StudentFinanceSummaryData | null;
  error: ApiErrorBody | null;
  reload: () => void;
}

export function useStudentFinanceSummary(
  studentId: string | number | null,
  academicYearId: string | number | null,
  enabled: boolean,
): StudentFinanceSummaryState {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StudentFinanceSummaryData | null>(null);
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
      academic_year_id: Number(academicYearId),
    };
    if (activeSchoolId != null) query.active_school_id = activeSchoolId;

    api
      .get<unknown>(endpoints.admin.studentFinanceSummary(studentId), query)
      .then((res) => {
        if (!active) return;
        if (res.success) {
          const normalized = normalizeStudentFinanceSummaryResponse(res.data);
          if (normalized) {
            setData(normalized);
            setError(null);
          } else {
            setData(null);
            setError({ code: 'server_error', message: 'Unexpected finance summary shape.' });
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
  }, [studentId, academicYearId, activeSchoolId, enabled, nonce]);

  return { loading, data, error, reload };
}
