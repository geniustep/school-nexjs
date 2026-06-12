'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { buildEnableSummary } from '../utils/level-options';
import type {
  EnableLevelResult,
  EnableLevelsResponse,
  LevelOptionsPayload,
  ReferenceLevelOption,
} from '@/types/academic-levels';
import type { ApiError, ApiErrorBody, ApiResponse, ListParams } from '@/types/api';
export type LevelOptionsQuery = {
  include_enabled?: string;
  cycle?: string | number;
  search?: string;
  page?: number;
  page_size?: number;
};

export function normalizeLevelOptionsPayload(
  data: LevelOptionsPayload | null | undefined,
): LevelOptionsPayload | null {
  if (!data || typeof data !== 'object') return null;
  const reference_levels = (Array.isArray(data.reference_levels) ? data.reference_levels : []).map(
    (level: ReferenceLevelOption) => ({
      ...level,
      link_status: level.link_status ?? (level.enabled ? 'enabled' : 'not_enabled'),
    }),
  );
  const cycles = Array.isArray(data.cycles) ? data.cycles : [];
  const permissions = data.permissions ?? { can_enable: false };
  return { reference_levels, cycles, permissions };
}

/** Always pass active=true on pages that show the drawer — avoids null data when opening. */
export function useLevelOptions(active = true, query?: LevelOptionsQuery) {
  const mergedQuery: LevelOptionsQuery = {
    include_enabled: 'true',
    ...query,
  };

  const state = useAdminResource<LevelOptionsPayload>(
    active ? endpoints.admin.levelsOptions : null,
    active ? mergedQuery : undefined,
  );

  const reload = useCallback(() => state.reload(), [state]);

  return {
    options: normalizeLevelOptionsPayload(state.data),
    loading: state.loading,
    error: state.error,
    reload,
  };
}

function failedResult(id: number, error: ApiErrorBody): EnableLevelResult {
  return {
    reference_level_id: id,
    status: 'failed',
    error: { code: String(error.code), message: error.message },
  };
}

function collectResultsFromError(
  id: number,
  res: ApiResponse<EnableLevelsResponse>,
): EnableLevelResult[] {
  if (!res.success) {
    const partial = (res as ApiError & { data?: EnableLevelsResponse }).data;
    if (partial?.results?.length) return partial.results;
    return [failedResult(id, res.error)];
  }
  return res.data.results ?? [];
}

/** Enable levels one-by-one so a duplicate/orphan does not fail the whole batch. */
export async function enableReferenceLevels(
  referenceLevelIds: number[],
  activeSchoolId?: number | null,
  options?: { createFirstClass?: boolean },
): Promise<
  | { ok: true; data: EnableLevelsResponse }
  | { ok: false; error: ApiErrorBody }
> {
  if (!referenceLevelIds.length) {
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

  const results: EnableLevelResult[] = [];
  let lastError: ApiErrorBody | null = null;

  for (const id of referenceLevelIds) {
    const body: Record<string, unknown> = {
      reference_level_ids: [id],
      create_first_class: options?.createFirstClass ?? false,
    };
    const res = await api.post<EnableLevelsResponse>(
      endpoints.admin.levelsEnable,
      body,
      query,
    );

    if (res.success) {
      results.push(...(res.data.results ?? []));
      continue;
    }

    lastError = res.error;
    results.push(...collectResultsFromError(id, res));
  }

  const summary = buildEnableSummary(results, referenceLevelIds.length);
  if (summary.enabled === 0 && summary.already_enabled === 0 && lastError) {
    return { ok: false, error: lastError };
  }

  return { ok: true, data: { results, summary } };
}
