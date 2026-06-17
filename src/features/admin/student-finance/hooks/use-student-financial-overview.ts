'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { endpoints } from '@/lib/api/endpoints';
import { applyCollectionUpdatedOverview } from '../utils/apply-collection-updated-overview';
import { normalizeStudentFinancialOverview } from '../utils/normalize-student-financial-overview';
import type { ApiErrorBody } from '@/types/api';
import type {
  CollectionUpdatedOverview,
  StudentFinancialOverview,
} from '@/types/student-financial-overview';

export interface StudentFinancialOverviewState {
  loading: boolean;
  data: StudentFinancialOverview | null;
  error: ApiErrorBody | null;
  reload: () => void;
  applyPatch: (patch: CollectionUpdatedOverview) => void;
}

export function useStudentFinancialOverview(
  studentId: string | number | null,
  academicYearId: string | number | null,
  enabled: boolean,
  refreshSignal = 0,
): StudentFinancialOverviewState {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StudentFinancialOverview | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const applyPatch = useCallback((patch: CollectionUpdatedOverview) => {
    setData((prev) => (prev ? applyCollectionUpdatedOverview(prev, patch) : prev));
  }, []);

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
      .get<unknown>(endpoints.admin.financeStudentFinancialOverview(studentId), query)
      .then((res) => {
        if (!active) return;
        if (res.success) {
          const normalized = normalizeStudentFinancialOverview(res.data);
          if (normalized) {
            setData(normalized);
            setError(null);
          } else {
            setError({ code: 'server_error', message: 'Unexpected financial overview shape.' });
          }
        } else {
          setError(res.error);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [studentId, academicYearId, activeSchoolId, enabled, nonce, refreshSignal]);

  return { loading, data, error, reload, applyPatch };
}
