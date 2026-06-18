'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody } from '@/types/api';
import type { StudentHealthCapabilities, StudentHealthProfile } from '@/types/student-360';
import { normalizeStudentHealthProfile } from '../utils/normalize-student-health';

export interface StudentHealthData {
  profile: StudentHealthProfile | null;
  capabilities: StudentHealthCapabilities;
}

export interface StudentHealthState {
  loading: boolean;
  data: StudentHealthData | null;
  error: ApiErrorBody | null;
  reload: () => void;
}

function normalizeCapabilities(value: unknown): StudentHealthCapabilities {
  if (!value || typeof value !== 'object') {
    return { can_view: false, can_manage: false };
  }
  const raw = value as Record<string, unknown>;
  return {
    can_view: raw.can_view === true,
    can_manage: raw.can_manage === true,
  };
}

function normalizeHealthResponse(data: unknown): StudentHealthData | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;

  if ('profile' in raw || 'capabilities' in raw) {
    const profile = normalizeStudentHealthProfile(raw.profile);
    return { profile, capabilities: normalizeCapabilities(raw.capabilities) };
  }

  if (
    'has_allergies' in raw ||
    'health_alert_level' in raw ||
    'blood_type' in raw ||
    'allergies' in raw
  ) {
    return {
      profile: normalizeStudentHealthProfile(raw),
      capabilities: { can_view: true, can_manage: true },
    };
  }

  return null;
}

export function useStudentHealth(
  studentId: string | number | null,
  enabled: boolean,
): StudentHealthState {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StudentHealthData | null>(null);
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
      .get<unknown>(endpoints.admin.studentHealth(studentId), query)
      .then((res) => {
        if (!active) return;
        if (res.success) {
          const normalized = normalizeHealthResponse(res.data);
          if (normalized) {
            setData(normalized);
            setError(null);
          } else {
            setData(null);
            setError({
              code: 'server_error',
              message: 'Unexpected health response shape.',
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
