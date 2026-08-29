'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody } from '@/types/api';
import type { StudentOptions, StudentOptionsPayload } from '@/types/student-360';
import { normalizeStudentOptions } from '../utils/student-options';
import { alignAcademicYearsWithActiveContext } from '../utils/full-registration-ui';

export interface StudentOptionsState {
  loading: boolean;
  options: StudentOptions | null;
  error: ApiErrorBody | null;
  reload: () => void;
}

export function useStudentOptions(): StudentOptionsState {
  const { activeSchoolId, activeAcademicYearId } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<StudentOptions | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const query =
      activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;

    api
      .get<StudentOptionsPayload>(endpoints.admin.studentsOptions, query)
      .then((res) => {
        if (!active) return;
        if (res.success) {
          const normalized = normalizeStudentOptions(res.data);
          setOptions({
            ...normalized,
            academicYears: alignAcademicYearsWithActiveContext(
              normalized.academicYears,
              activeAcademicYearId,
            ),
          });
          setError(null);
        } else {
          setOptions(null);
          setError(res.error);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeAcademicYearId, activeSchoolId, nonce]);

  return { loading, options, error, reload };
}
