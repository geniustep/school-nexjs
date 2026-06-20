'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAdmissionPrefill } from '../api/admissions-api';
import { useAdminSession } from '@/features/auth/admin-session-context';
import type { ApiErrorBody } from '@/types/api';
import type { AdmissionPrefill } from '@/types/admission';

export function useAdmissionPrefill(admissionId: string | null, enabled: boolean) {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdmissionPrefill | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    if (!admissionId || activeSchoolId == null || !enabled) return;
    setLoading(true);
    setError(null);
    fetchAdmissionPrefill(admissionId, { active_school_id: activeSchoolId }).then((res) => {
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setData(null);
        setError(res.error);
      }
      setLoading(false);
      setLoaded(true);
    });
  }, [admissionId, activeSchoolId, enabled]);

  useEffect(() => {
    if (enabled && !loaded) load();
  }, [enabled, loaded, load]);

  return { loading, data, error, load, loaded };
}
