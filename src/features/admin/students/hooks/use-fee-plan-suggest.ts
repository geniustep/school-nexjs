'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { FeePlanSuggestError, FeePlanSuggestQuery, FeePlanSuggestResult } from '@/types/student-enrollment-finance';
import { buildFeePlanSuggestErrorFromApi, financePlanFingerprint } from '../utils/student-enrollment-finance';
import {
  normalizeFeePlanSuggestResponse,
  resolveFeePlanSuggestErrorCode,
} from '../utils/normalize-fee-plan-suggest';
import { readFullRegistrationOptionalLines } from '../utils/full-registration-optional-lines';

export interface FeePlanSuggestState {
  loading: boolean;
  suggest: FeePlanSuggestResult | null;
  error: FeePlanSuggestError | null;
  reload: () => void;
}

export function useFeePlanSuggest(query: FeePlanSuggestQuery | null): FeePlanSuggestState {
  const [loading, setLoading] = useState(false);
  const [suggest, setSuggest] = useState<FeePlanSuggestResult | null>(null);
  const [error, setError] = useState<FeePlanSuggestError | null>(null);
  const [nonce, setNonce] = useState(0);
  const fingerprint = financePlanFingerprint(query);
  const queryRef = useRef(query);
  queryRef.current = query;

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const currentQuery = queryRef.current;
    if (!currentQuery) {
      setSuggest(null);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const params: Record<string, string | number> = {
      school_id: currentQuery.school_id,
      academic_year_id: currentQuery.academic_year_id,
      level_id: currentQuery.level_id,
      enrollment_date: currentQuery.enrollment_date,
    };
    if (currentQuery.fee_plan_id != null) {
      params.fee_plan_id = currentQuery.fee_plan_id;
    }

    api
      .get<unknown>(endpoints.admin.financeFeePlanSuggest, params)
      .then(async (res) => {
        if (!active) return;
        if (!res.success) {
          setSuggest(null);
          setError(buildFeePlanSuggestErrorFromApi(res.error));
          setLoading(false);
          return;
        }

        const inlineError = resolveFeePlanSuggestErrorCode(res.data);
        if (inlineError) {
          setSuggest(null);
          setError({ code: inlineError });
          setLoading(false);
          return;
        }

        const normalized = normalizeFeePlanSuggestResponse(res.data);
        if (!normalized) {
          setSuggest(null);
          setError({ code: 'invalid_suggest_response' });
          setLoading(false);
          return;
        }

        const planRes = await api.get<unknown>(endpoints.admin.financeFeePlan(normalized.fee_plan_id));
        if (!active) return;
        if (!planRes.success) {
          setSuggest(null);
          setError({ code: 'fee_plan_details_unavailable' });
          setLoading(false);
          return;
        }

        const withOptionalLines = normalized as FeePlanSuggestResult & {
          optional_lines?: ReturnType<typeof readFullRegistrationOptionalLines>;
        };
        withOptionalLines.optional_lines = readFullRegistrationOptionalLines(planRes.data);

        setSuggest(withOptionalLines);
        setError(null);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setSuggest(null);
        setError({ code: 'fee_plan_details_unavailable' });
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fingerprint, nonce]);

  return { loading, suggest, error, reload };
}
