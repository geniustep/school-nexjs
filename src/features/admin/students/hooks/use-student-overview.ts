'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody } from '@/types/api';
import type { StudentOverviewData } from '@/types/student-overview';
import { normalizeStudentOverviewResponse } from '../utils/normalize-student-overview';

export interface StudentOverviewState {
  loading: boolean;
  data: StudentOverviewData | null;
  error: ApiErrorBody | null;
  endpointUnavailable: boolean;
  reload: () => void;
}

export function useStudentOverview(
  studentId: string | number | null,
  enabled: boolean,
): StudentOverviewState {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(
    () => Boolean(enabled && studentId && studentId !== 'new'),
  );
  const [data, setData] = useState<StudentOverviewData | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [endpointUnavailable, setEndpointUnavailable] = useState(false);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !studentId || studentId === 'new') {
      setLoading(false);
      setData(null);
      setError(null);
      setEndpointUnavailable(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setEndpointUnavailable(false);

    const query =
      activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;

    api
      .get<unknown>(endpoints.admin.studentOverview(studentId), query)
      .then((res) => {
        if (!active) return;
        if (res.success) {
          const normalized = normalizeStudentOverviewResponse(res.data);
          if (normalized) {
            setData(normalized);
            setError(null);
            setEndpointUnavailable(normalized.available === false);
          } else {
            setData(null);
            setError({
              code: 'server_error',
              message: 'Unexpected overview response shape.',
            });
          }
        } else {
          const code = res.error?.code ?? '';
          if (code === 'not_found' || code === 'endpoint_not_found') {
            setEndpointUnavailable(true);
            setData(null);
            setError(null);
          } else if (code === 'unauthenticated' || code === 'permission_denied' || code === 'forbidden') {
            setError(res.error);
            setData(null);
          } else {
            setError(res.error);
            setData(null);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError({ code: 'network_error', message: 'Network error.' });
        setData(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [studentId, activeSchoolId, enabled, nonce]);

  return { loading, data, error, endpointUnavailable, reload };
}
