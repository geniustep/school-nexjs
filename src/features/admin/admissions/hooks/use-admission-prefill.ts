'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAdmissionPrefill } from '../api/admissions-api';
import { useAdminSession } from '@/features/auth/admin-session-context';
import type { ApiErrorBody } from '@/types/api';
import type { AdmissionPrefill } from '@/types/admission';
import {
  applyAdmissionGuardianResolution,
  parseAdmissionGuardianResolution,
} from '@/features/admin/students/utils/admission-guardian-pre-resolution';

function applyFullRegistrationGuardianResolution(
  admissionId: string,
  prefill: AdmissionPrefill,
): AdmissionPrefill {
  if (typeof window === 'undefined' || window.location.pathname !== '/admin/students/new') return prefill;
  const params = new URLSearchParams(window.location.search);
  if (params.get('admission_id') !== admissionId) return prefill;
  const resolution = parseAdmissionGuardianResolution(params.get('guardian_resolution'));
  return applyAdmissionGuardianResolution(prefill, resolution);
}

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
        setData(applyFullRegistrationGuardianResolution(admissionId, res.data));
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
