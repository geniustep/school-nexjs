'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { endpoints } from '@/lib/api/endpoints';
import type { CoGuardianStudentsData } from '@/types/student-co-guardian';
import { normalizeCoGuardianStudentsResponse } from '../utils/normalize-co-guardian-students';

export interface StudentCoGuardianStudentsState {
  loading: boolean;
  data: CoGuardianStudentsData | null;
  /** True when the endpoint failed in a way that should hide the panel quietly. */
  failed: boolean;
  reload: () => void;
}

export function useStudentCoGuardianStudents(
  studentId: string | number | null,
  enabled: boolean,
): StudentCoGuardianStudentsState {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(
    () => Boolean(enabled && studentId && studentId !== 'new'),
  );
  const [data, setData] = useState<CoGuardianStudentsData | null>(null);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !studentId || studentId === 'new') {
      setLoading(false);
      setData(null);
      setFailed(false);
      return;
    }

    let active = true;
    setLoading(true);
    setFailed(false);

    const query = activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;

    api
      .get<unknown>(endpoints.admin.studentCoGuardianStudents(studentId), query)
      .then((res) => {
        if (!active) return;
        if (res.success) {
          const normalized = normalizeCoGuardianStudentsResponse(res.data);
          if (normalized) {
            setData(normalized);
            setFailed(false);
          } else {
            setData(null);
            setFailed(true);
          }
        } else {
          // Never break Student 360: any error (not_found, forbidden, server) hides the panel.
          setData(null);
          setFailed(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setData(null);
        setFailed(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [studentId, activeSchoolId, enabled, nonce]);

  return { loading, data, failed, reload };
}
