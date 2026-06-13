'use client';

import { useCallback, useMemo } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { buildEnableSummary, sortReferenceTracks } from '../utils/level-options';
import type {
  EnableLevelsRequest,
  EnableLevelsResponse,
  LevelOptionsPayload,
  ReferenceLevelOption,
  ReferenceTrackOption,
} from '@/types/academic-levels';
import type { ApiError, ApiErrorBody, ListParams } from '@/types/api';

export type LevelOptionsQuery = {
  include_enabled?: string;
  cycle?: string | number;
  search?: string;
  page?: number;
  page_size?: number;
};

function normalizeReferenceTrack(raw: Partial<ReferenceTrackOption>): ReferenceTrackOption {
  return {
    id: Number(raw.id),
    code: String(raw.code ?? ''),
    name: String(raw.name ?? ''),
    sequence: Number(raw.sequence ?? 0),
    enabled: Boolean(raw.enabled),
    school_track_id:
      raw.school_track_id == null || raw.school_track_id === undefined
        ? null
        : Number(raw.school_track_id),
    can_enable: Boolean(raw.can_enable),
  };
}

function normalizeReferenceLevel(level: ReferenceLevelOption): ReferenceLevelOption {
  const reference_tracks = sortReferenceTracks(
    (Array.isArray(level.reference_tracks) ? level.reference_tracks : []).map((track) =>
      normalizeReferenceTrack(track),
    ),
  );
  return {
    ...level,
    reference_tracks,
    link_status: level.link_status ?? (level.enabled ? 'enabled' : 'not_enabled'),
  };
}

export function normalizeLevelOptionsPayload(
  data: LevelOptionsPayload | null | undefined,
): LevelOptionsPayload | null {
  if (!data || typeof data !== 'object') return null;
  const reference_levels = (Array.isArray(data.reference_levels) ? data.reference_levels : []).map(
    (level: ReferenceLevelOption) => normalizeReferenceLevel(level),
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

  const options = useMemo(
    () => normalizeLevelOptionsPayload(state.data),
    [state.data],
  );
  const reload = useCallback(() => state.reload(), [state.reload]);

  return {
    options,
    loading: state.loading,
    error: state.error,
    reload,
  };
}

/** Enable selected levels in one batch request (supports mixed normal + track levels). */
export async function enableReferenceLevels(
  payload: EnableLevelsRequest,
  activeSchoolId?: number | null,
): Promise<
  | { ok: true; data: EnableLevelsResponse }
  | { ok: false; error: ApiErrorBody }
> {
  if (!payload.reference_level_ids.length) {
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

  const res = await api.post<EnableLevelsResponse>(
    endpoints.admin.levelsEnable,
    payload,
    query,
  );

  if (res.success) {
    const results = res.data.results ?? [];
    const summary = res.data.summary ?? buildEnableSummary(results, payload.reference_level_ids.length);
    return { ok: true, data: { results, summary } };
  }

  const partial = (res as ApiError & { data?: EnableLevelsResponse }).data;
  if (partial?.results?.length) {
    const summary =
      partial.summary ?? buildEnableSummary(partial.results, payload.reference_level_ids.length);
    return { ok: true, data: { results: partial.results, summary } };
  }

  return { ok: false, error: res.error };
}
