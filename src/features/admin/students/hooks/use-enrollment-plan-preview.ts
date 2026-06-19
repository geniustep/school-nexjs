'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  EnrollmentPlanPreviewResult,
  FeePlanSuggestResult,
  StudentCreateFinanceFormState,
} from '@/types/student-enrollment-finance';
import type { StudentProfileFormState } from '../utils/student-profile';
import {
  buildEnrollmentPlanPreviewBody,
  financePreviewFingerprint,
  mapEnrollmentPreviewErrorMessage,
} from '../utils/student-enrollment-finance';
import type { FeePlanSuggestQuery } from '@/types/student-enrollment-finance';
import {
  normalizeFeePlanSuggestResponse,
  readEnrollmentPlanPreview,
} from '../utils/normalize-fee-plan-suggest';

export interface EnrollmentPlanPreviewState {
  loading: boolean;
  preview: EnrollmentPlanPreviewResult | null;
  error: string | null;
}

export function useEnrollmentPlanPreview(input: {
  enabled: boolean;
  query: FeePlanSuggestQuery | null;
  profileState: StudentProfileFormState;
  schoolId: number | null;
  suggest: FeePlanSuggestResult | null;
  financeState: StudentCreateFinanceFormState;
  t: (key: string) => string;
}): EnrollmentPlanPreviewState {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<EnrollmentPlanPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const fingerprint = financePreviewFingerprint({
    query: input.query,
    financeState: input.financeState,
  });

  useEffect(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!input.enabled || !input.query || !input.suggest || input.schoolId == null) {
      setPreview(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!input.financeState.customizePlan) {
      setPreview(input.suggest.preview ?? null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = window.setTimeout(() => {
      const body = buildEnrollmentPlanPreviewBody(
        input.profileState,
        input.schoolId as number,
        input.suggest as FeePlanSuggestResult,
        input.financeState,
      );

      api.post<unknown>(endpoints.admin.financeEnrollmentPlanPreview, body).then((res) => {
        if (!res.success) {
          setPreview(null);
          setError(mapEnrollmentPreviewErrorMessage(res.error, input.t));
          setLoading(false);
          return;
        }

        const normalized = normalizeFeePlanSuggestResponse(res.data);
        const previewResult =
          readEnrollmentPlanPreview(
            (res.data as { preview?: unknown } | null)?.preview ?? res.data,
          ) ?? normalized?.preview ?? null;

        if (!previewResult) {
          setPreview(null);
          setError(input.t('admin.student360.create.finance.previewError'));
          setLoading(false);
          return;
        }

        setPreview(previewResult);
        setError(null);
        setLoading(false);
      });
    }, 350);

    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, [
    fingerprint,
    input.enabled,
    input.financeState.customizePlan,
    input.query,
    input.schoolId,
    input.suggest,
    input.t,
  ]);

  return { loading, preview, error };
}
