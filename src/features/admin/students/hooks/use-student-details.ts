'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminSession } from '@/features/auth/admin-session-context';
import type { ApiErrorBody, ApiMeta } from '@/types/api';
import type { StudentDetailsData } from '@/types/student-360';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeStudentDetailsResponse } from '../utils/normalize-student-details';

export interface StudentDetailsState {
  loading: boolean;
  data: StudentDetailsData | null;
  meta: ApiMeta | null;
  error: ApiErrorBody | null;
  reload: () => void;
}

export function useStudentDetails(studentId: string | number | null): StudentDetailsState {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentDetailsData | null>(null);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!studentId || studentId === 'new') {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const query =
      activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;

    api
      .get<unknown>(endpoints.admin.student(studentId), query)
      .then((res) => {
        if (!active) return;
        if (res.success) {
          const normalized = normalizeStudentDetailsResponse(res.data);
          if (normalized) {
            setData(normalized);
            setMeta(res.meta);
            setError(null);
          } else {
            setData(null);
            setError({
              code: 'server_error',
              message: 'Unexpected student details shape.',
            });
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
  }, [studentId, activeSchoolId, nonce]);

  return { loading, data, meta, error, reload };
}
