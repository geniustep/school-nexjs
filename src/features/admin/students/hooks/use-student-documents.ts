'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody } from '@/types/api';
import type { StudentDocumentsData } from '@/types/student-360';
import { normalizeStudentDocumentsResponse } from '../utils/normalize-student-documents';

export interface StudentDocumentsState {
  loading: boolean;
  data: StudentDocumentsData | null;
  error: ApiErrorBody | null;
  reload: () => void;
}

export function useStudentDocuments(
  studentId: string | number | null,
  enabled: boolean,
): StudentDocumentsState {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(
    () => Boolean(enabled && studentId && studentId !== 'new'),
  );
  const [data, setData] = useState<StudentDocumentsData | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !studentId || studentId === 'new') {
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
      .get<unknown>(endpoints.admin.studentDocuments(studentId), query)
      .then((res) => {
        if (!active) return;
        if (res.success) {
          const normalized = normalizeStudentDocumentsResponse(res.data);
          if (normalized) {
            setData(normalized);
            setError(null);
          } else {
            setData(null);
            setError({
              code: 'server_error',
              message: 'Unexpected documents response shape.',
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
  }, [studentId, activeSchoolId, enabled, nonce]);

  return { loading, data, error, reload };
}
