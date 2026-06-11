'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { buildEnableSubjectsSummary } from '../utils/subject-options';
import type {
  EnableSubjectResult,
  EnableSubjectsResponse,
  SubjectOptionsPayload,
} from '@/types/academic-subjects';
import type { ApiError, ApiErrorBody, ApiResponse, ListParams } from '@/types/api';

export type SubjectOptionsQuery = {
  level_id?: number;
  track_id?: number;
  include_enabled?: string;
};

export function normalizeSubjectOptionsPayload(
  data: SubjectOptionsPayload | null | undefined,
): SubjectOptionsPayload | null {
  if (!data || typeof data !== 'object') return null;
  const reference_subjects = Array.isArray(data.reference_subjects)
    ? data.reference_subjects
    : [];
  const permissions = data.permissions ?? { can_enable: false };
  if (!data.level || typeof data.level.id !== 'number') return null;
  return {
    level: data.level,
    track: data.track ?? null,
    reference_subjects,
    permissions,
  };
}

export function useSubjectOptions(
  levelId: number | null,
  trackId: number | null = null,
  active = true,
) {
  const query: SubjectOptionsQuery | undefined =
    active && levelId != null
      ? {
          level_id: levelId,
          include_enabled: 'true',
          ...(trackId != null ? { track_id: trackId } : {}),
        }
      : undefined;

  const state = useAdminResource<SubjectOptionsPayload>(
    query ? endpoints.admin.subjectsOptions : null,
    query as ListParams | undefined,
  );

  const reload = useCallback(() => state.reload(), [state]);

  return {
    options: normalizeSubjectOptionsPayload(state.data),
    loading: state.loading,
    error: state.error,
    reload,
  };
}

function failedSubjectResult(id: number, error: ApiErrorBody): EnableSubjectResult {
  return {
    reference_subject_id: id,
    status: 'failed',
    error: { code: String(error.code), message: error.message },
  };
}

function collectResultsFromError(
  ids: number[],
  res: ApiResponse<EnableSubjectsResponse>,
): EnableSubjectResult[] {
  if (!res.success) {
    const partial = (res as ApiError & { data?: EnableSubjectsResponse }).data;
    if (partial?.results?.length) return partial.results;
    return ids.map((id) => failedSubjectResult(id, res.error));
  }
  return res.data.results ?? [];
}

export async function enableReferenceSubjects(
  payload: {
    level_id: number;
    track_id?: number;
    reference_subject_ids: number[];
  },
  activeSchoolId?: number | null,
): Promise<
  | { ok: true; data: EnableSubjectsResponse }
  | { ok: false; error: ApiErrorBody }
> {
  const { reference_subject_ids, level_id, track_id } = payload;
  if (!reference_subject_ids.length) {
    return {
      ok: true,
      data: {
        results: [],
        summary: { requested: 0, enabled: 0, already_enabled: 0, failed: 0 },
      },
    };
  }

  const query: ListParams | undefined =
    activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;

  const body: Record<string, unknown> = {
    level_id,
    reference_subject_ids,
  };
  if (track_id != null) body.track_id = track_id;

  const res = await api.post<EnableSubjectsResponse>(
    endpoints.admin.subjectsEnable,
    body,
    query,
  );

  if (res.success) {
    const summary =
      res.data.summary ??
      buildEnableSubjectsSummary(res.data.results ?? [], reference_subject_ids.length);
    return { ok: true, data: { ...res.data, summary } };
  }

  const results = collectResultsFromError(reference_subject_ids, res);
  const summary = buildEnableSubjectsSummary(results, reference_subject_ids.length);
  if (summary.enabled === 0 && summary.already_enabled === 0) {
    return { ok: false, error: res.error };
  }

  return { ok: true, data: { results, summary } };
}
