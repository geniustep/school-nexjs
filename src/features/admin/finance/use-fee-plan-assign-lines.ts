'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeFeePlanLines } from '@/lib/utils/fee-plan-line-normalize';
import type { ApiErrorBody } from '@/types/api';
import type { FeePlan } from '@/types/finance';
import {
  mergeFeePlanWithDetailLines,
  needsFeePlanDetailFetch,
  planListHasAssignableLines,
} from './fee-plan-assign-lines';

export function useFeePlanAssignLines(selectedPlan: FeePlan | undefined): {
  plan: FeePlan | undefined;
  loading: boolean;
  error: ApiErrorBody | null;
  reload: () => void;
  linesReady: boolean;
  usedDetailEndpoint: boolean;
} {
  const [detailPlan, setDetailPlan] = useState<FeePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const listHasLines = planListHasAssignableLines(selectedPlan);
  const shouldFetchDetail = Boolean(selectedPlan && needsFeePlanDetailFetch(selectedPlan));

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!selectedPlan || listHasLines) {
      setDetailPlan(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadDetail() {
      setLoading(true);
      setError(null);
      const res = await api.get<FeePlan>(endpoints.admin.financeFeePlan(selectedPlan!.id));
      if (cancelled) return;
      setLoading(false);
      if (!res.success) {
        setDetailPlan(null);
        setError(res.error);
        return;
      }
      const data = res.data;
      setDetailPlan(
        data
          ? {
              ...data,
              lines: normalizeFeePlanLines(data.lines),
            }
          : null,
      );
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedPlan, listHasLines, reloadToken]);

  const plan = useMemo(() => {
    if (!selectedPlan) return undefined;
    if (listHasLines) return selectedPlan;
    if (detailPlan) return mergeFeePlanWithDetailLines(selectedPlan, detailPlan);
    return selectedPlan;
  }, [selectedPlan, listHasLines, detailPlan]);

  const linesReady = Boolean(
    selectedPlan &&
      (listHasLines || (!loading && !error && detailPlan != null)),
  );

  return {
    plan,
    loading: shouldFetchDetail && loading,
    error: shouldFetchDetail ? error : null,
    reload,
    linesReady,
    usedDetailEndpoint: shouldFetchDetail && detailPlan != null && !listHasLines,
  };
}
