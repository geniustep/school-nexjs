'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { endpoints } from '@/lib/api/endpoints';
import {
  normalizeFamilyCollectionContext,
  normalizeFamilyFinanceSummary,
  normalizeFamilyPlanContext,
} from '@/lib/utils/normalize-family-finance';
import type { ApiErrorBody } from '@/types/api';
import type {
  FamilyCollectionContext,
  FamilyFinanceSummary,
  FamilyPlanContext,
} from '@/types/family-finance';
import {
  getStudentFamilyCollectionContext,
  getStudentFamilyFinanceSummary,
  getStudentFamilyPlanContext,
} from '../api/family-finance-api';

export interface FamilyFinanceResourceState<T> {
  loading: boolean;
  data: T | null;
  error: ApiErrorBody | null;
  reload: () => void;
}

function useStudentFamilyResource<T>(
  fetcher: (
    studentId: number,
    query: Record<string, string | number>,
  ) => Promise<{ success: true; data: T } | { success: false; error: ApiErrorBody }>,
  normalizer: (raw: unknown) => T | null,
  studentId: number | null,
  enabled: boolean,
  refreshSignal = 0,
): FamilyFinanceResourceState<T> {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (refreshSignal > 0) reload();
  }, [refreshSignal, reload]);

  useEffect(() => {
    if (!enabled || !studentId) {
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

    fetcher(studentId, query)
      .then((res) => {
        if (!active) return;
        if (!res.success) {
          setData(null);
          setError(res.error);
          return;
        }
        setData(normalizer(res.data));
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
  }, [studentId, enabled, activeSchoolId, nonce, fetcher, normalizer]);

  return { loading, data, error, reload };
}

const normalizeSummary = (raw: unknown) => normalizeFamilyFinanceSummary(raw);
const normalizePlan = (raw: unknown) => normalizeFamilyPlanContext(raw);
const normalizeCollection = (raw: unknown) => normalizeFamilyCollectionContext(raw);

export function useStudentFamilyFinanceSummary(
  studentId: number | null,
  enabled = true,
  refreshSignal = 0,
): FamilyFinanceResourceState<FamilyFinanceSummary> {
  const fetcher = useCallback(
    (id: number, query: Record<string, string | number>) =>
      getStudentFamilyFinanceSummary(id, query),
    [],
  );
  return useStudentFamilyResource(fetcher, normalizeSummary, studentId, enabled, refreshSignal);
}

export function useStudentFamilyPlanContext(
  studentId: number | null,
  enabled = true,
  refreshSignal = 0,
): FamilyFinanceResourceState<FamilyPlanContext> {
  const fetcher = useCallback(
    (id: number, query: Record<string, string | number>) =>
      getStudentFamilyPlanContext(id, query),
    [],
  );
  return useStudentFamilyResource(fetcher, normalizePlan, studentId, enabled, refreshSignal);
}

export function useStudentFamilyCollectionContext(
  studentId: number | null,
  enabled = true,
  refreshSignal = 0,
): FamilyFinanceResourceState<FamilyCollectionContext> {
  const fetcher = useCallback(
    (id: number, query: Record<string, string | number>) =>
      getStudentFamilyCollectionContext(id, query),
    [],
  );
  return useStudentFamilyResource(fetcher, normalizeCollection, studentId, enabled, refreshSignal);
}

export function studentFamilyFinancePaths(studentId: number) {
  return useMemo(
    () => ({
      summary: endpoints.admin.financeStudentFamilySummary(studentId),
      planContext: endpoints.admin.financeStudentFamilyPlanContext(studentId),
      collectionContext: endpoints.admin.financeStudentFamilyCollectionContext(studentId),
    }),
    [studentId],
  );
}
