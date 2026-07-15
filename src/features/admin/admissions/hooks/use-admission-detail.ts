'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAdmission } from '../api/admissions-api';
import { useAdminSession } from '@/features/auth/admin-session-context';
import type { ApiErrorBody } from '@/types/api';
import type { AdmissionDetail } from '@/types/admission';

export function useAdmissionDetail(admissionId: string | null) {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdmissionDetail | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  /** Apply action response immediately (no empty flash), optionally soft-refresh. */
  const replaceData = useCallback((next: AdmissionDetail) => {
    setData(next);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!admissionId || activeSchoolId == null) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetchAdmission(admissionId, { active_school_id: activeSchoolId }).then((res) => {
      if (!active) return;
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setData(null);
        setError(res.error);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [admissionId, activeSchoolId, nonce]);

  return { loading, data, error, reload, replaceData };
}
