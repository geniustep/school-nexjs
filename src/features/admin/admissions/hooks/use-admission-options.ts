'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '@/features/i18n/locale-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdmissionOptions, AdmissionOptionsPayload } from '@/types/admission';
import type { ApiErrorBody } from '@/types/api';
import { normalizeAdmissionOptions } from '../utils/admission-options';

export function useAdmissionOptions() {
  const { locale } = useLocale();
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<AdmissionOptions | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const query: Record<string, string | number> = { lang: locale };
    if (activeSchoolId != null) query.active_school_id = activeSchoolId;

    api.get<AdmissionOptionsPayload>(endpoints.admin.admissionsOptions, query).then((res) => {
      if (!active) return;
      if (res.success) {
        setOptions(normalizeAdmissionOptions(res.data));
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
  }, [activeSchoolId, locale, nonce]);

  return { loading, options, error, reload };
}
