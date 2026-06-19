'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { FeePlanSuggestQuery, FeePlanSuggestResult } from '@/types/student-enrollment-finance';
import { financePlanFingerprint } from '../utils/student-enrollment-finance';
import {
  normalizeFeePlanSuggestResponse,
  resolveFeePlanSuggestErrorCode,
} from '../utils/normalize-fee-plan-suggest';

export interface FeePlanSuggestState {
  loading: boolean;
  suggest: FeePlanSuggestResult | null;
  errorCode: string | null;
  reload: () => void;
}

export function useFeePlanSuggest(query: FeePlanSuggestQuery | null): FeePlanSuggestState {
  const [loading, setLoading] = useState(false);
  const [suggest, setSuggest] = useState<FeePlanSuggestResult | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const fingerprint = financePlanFingerprint(query);
  const queryRef = useRef(query);
  queryRef.current = query;

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const currentQuery = queryRef.current;
    if (!currentQuery) {
      setSuggest(null);
      setErrorCode(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setErrorCode(null);

    api
      .get<unknown>(endpoints.admin.financeFeePlanSuggest, {
        school_id: currentQuery.school_id,
        academic_year_id: currentQuery.academic_year_id,
        level_id: currentQuery.level_id,
        enrollment_date: currentQuery.enrollment_date,
      })
      .then((res) => {
        if (!active) return;
        if (!res.success) {
          setSuggest(null);
          setErrorCode(res.error.code ?? 'server_error');
          setLoading(false);
          return;
        }

        const inlineError = resolveFeePlanSuggestErrorCode(res.data);
        if (inlineError) {
          setSuggest(null);
          setErrorCode(inlineError);
          setLoading(false);
          return;
        }

        const normalized = normalizeFeePlanSuggestResponse(res.data);
        if (!normalized) {
          setSuggest(null);
          setErrorCode('invalid_suggest_response');
          setLoading(false);
          return;
        }

        setSuggest(normalized);
        setErrorCode(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fingerprint, nonce]);

  return { loading, suggest, errorCode, reload };
}
