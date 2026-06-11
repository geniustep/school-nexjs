'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { EnableLevelsResponse, LevelOptionsPayload } from '@/types/academic-levels';
import type { ApiErrorBody } from '@/types/api';
export type LevelOptionsQuery = {
  include_enabled?: string;
  cycle?: string | number;
  search?: string;
  page?: number;
  page_size?: number;
};

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
    options: state.data,
    loading: state.loading,
    error: state.error,
    reload,
  };
}

export async function enableReferenceLevels(
  referenceLevelIds: number[],
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

  const res = await api.post<EnableLevelsResponse>(endpoints.admin.levelsEnable, {
    reference_level_ids: referenceLevelIds,
  });

  if (res.success) {
    return { ok: true, data: res.data };
  }

  return { ok: false, error: res.error };
}
