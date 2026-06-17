'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeCollectibleItemsResponse } from '../utils/normalize-student-financial-overview';
import type { ApiErrorBody } from '@/types/api';
import type { CollectibleItemsResponse } from '@/types/student-financial-overview';

export interface StudentCollectibleItemsState {
  loading: boolean;
  data: CollectibleItemsResponse | null;
  error: ApiErrorBody | null;
  reload: () => void;
}

export function useStudentCollectibleItems(
  studentId: string | number | null,
  academicYearId: string | number | null,
  enabled: boolean,
  extraQuery?: Record<string, string | number>,
  refreshSignal = 0,
): StudentCollectibleItemsState {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CollectibleItemsResponse | null>(null);
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
      ...extraQuery,
    };
    if (activeSchoolId != null) query.active_school_id = activeSchoolId;

    api
      .get<unknown>(endpoints.admin.financeStudentCollectibleItems(studentId), query)
      .then((res) => {
        if (!active) return;
        if (res.success) {
          const normalized = normalizeCollectibleItemsResponse(res.data);
          if (normalized) {
            setData(normalized);
            setError(null);
          } else {
            setData(null);
            setError({ code: 'server_error', message: 'Unexpected collectible items shape.' });
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
  }, [studentId, academicYearId, activeSchoolId, enabled, nonce, refreshSignal]);

  return { loading, data, error, reload };
}
