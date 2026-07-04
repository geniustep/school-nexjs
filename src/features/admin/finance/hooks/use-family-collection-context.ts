'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { normalizeFamilyCollectionContext } from '@/lib/utils/normalize-family-finance';
import type { ApiErrorBody } from '@/types/api';
import type { FamilyCollectionContext } from '@/types/family-finance';
import { getFamilyCollectionContext } from '@/features/admin/student-finance/api/family-finance-api';

export function useFamilyCollectionContext(
  familyId: number | null,
  enabled = true,
  refreshSignal = 0,
): {
  loading: boolean;
  data: FamilyCollectionContext | null;
  error: ApiErrorBody | null;
  reload: () => void;
} {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FamilyCollectionContext | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (refreshSignal > 0) reload();
  }, [refreshSignal, reload]);

  useEffect(() => {
    if (!enabled || !familyId) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const query: Record<string, string | number> = {};
    if (activeSchoolId != null) query.active_school_id = activeSchoolId;

    getFamilyCollectionContext(familyId, query)
      .then((res) => {
        if (!active) return;
        if (!res.success) {
          setData(null);
          setError(res.error);
          return;
        }
        setData(normalizeFamilyCollectionContext(res.data));
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setData(null);
        setError({ code: 'network_error', message: 'Network error' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [familyId, enabled, activeSchoolId, nonce]);

  return { loading, data, error, reload };
}
