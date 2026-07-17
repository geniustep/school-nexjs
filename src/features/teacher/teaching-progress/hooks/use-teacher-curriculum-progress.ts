'use client';

/**
 * Single fetch coordinator for teacher curriculum progress.
 * Disabled until class (+ offering when required) is complete.
 * After decisions, callers call `reload()` to invalidate summary + next-item.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ApiErrorBody } from '@/types/api';
import type {
  TeachingProgressSummary,
  TeachingTeacherNextItemPayload,
} from '@/types/teaching-delivery';
import {
  fetchTeacherCurriculumProgressSummary,
  fetchTeacherSuggestedNextItem,
  type CurriculumProgressContextQuery,
} from '@/features/teacher/teaching-progress/api/teacher-curriculum-progress-api';

export type TeacherCurriculumProgressState = {
  summary: TeachingProgressSummary | null;
  nextItem: TeachingTeacherNextItemPayload | null;
  loading: boolean;
  fetching: boolean;
  error: ApiErrorBody | null;
  contextKey: string | null;
  reload: () => void;
};

function toContext(
  classId: string,
  offeringId: string,
  academicYearId?: string,
): CurriculumProgressContextQuery | null {
  const classNum = Number(classId);
  if (!classId || !Number.isFinite(classNum) || classNum <= 0) return null;
  const offeringNum = Number(offeringId);
  const yearNum = academicYearId ? Number(academicYearId) : NaN;
  return {
    class_id: classNum,
    offering_id: Number.isFinite(offeringNum) && offeringNum > 0 ? offeringNum : undefined,
    teaching_offering_id: Number.isFinite(offeringNum) && offeringNum > 0 ? offeringNum : undefined,
    academic_year_id: Number.isFinite(yearNum) && yearNum > 0 ? yearNum : undefined,
  };
}

export function useTeacherCurriculumProgress(args: {
  classId: string;
  offeringId: string;
  academicYearId?: string;
  /** When false, no network calls. */
  enabled?: boolean;
}): TeacherCurriculumProgressState {
  const enabled = args.enabled !== false;
  const ctx = toContext(args.classId, args.offeringId, args.academicYearId);
  const contextKey = ctx
    ? `${ctx.class_id}:${ctx.offering_id ?? ''}:${ctx.academic_year_id ?? ''}`
    : null;

  const [summary, setSummary] = useState<TeachingProgressSummary | null>(null);
  const [nextItem, setNextItem] = useState<TeachingTeacherNextItemPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [tick, setTick] = useState(0);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !ctx || !contextKey) {
      setSummary(null);
      setNextItem(null);
      setError(null);
      setLoading(false);
      setFetching(false);
      setResolvedKey(null);
      return;
    }

    let cancelled = false;
    setSummary(null);
    setNextItem(null);
    setResolvedKey(null);
    setError(null);
    setLoading(true);
    setFetching(true);

    (async () => {
      const summaryRes = await fetchTeacherCurriculumProgressSummary(ctx);
      if (cancelled) return;
      if (!summaryRes.success) {
        setError(summaryRes.error);
        setSummary(null);
        setNextItem(null);
        setResolvedKey(contextKey);
        setLoading(false);
        setFetching(false);
        return;
      }
      setSummary(summaryRes.data);

      if (ctx.offering_id) {
        const nextRes = await fetchTeacherSuggestedNextItem(ctx);
        if (cancelled) return;
        if (nextRes.success) {
          setNextItem(nextRes.data);
        } else if (
          nextRes.error?.code &&
          nextRes.error.code !== 'next_item_active_distribution_required'
        ) {
          setError(nextRes.error);
        }
      }

      setResolvedKey(contextKey);
      setLoading(false);
      setFetching(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, contextKey, tick]);

  const matches = resolvedKey === contextKey;

  return {
    summary: matches ? summary : null,
    nextItem: matches ? nextItem : null,
    loading: Boolean(enabled && contextKey && !matches),
    fetching,
    error: matches ? error : null,
    contextKey,
    reload,
  };
}
