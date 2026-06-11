'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { ApiErrorBody } from '@/types/api';

export interface ReferenceLevel {
  id: number;
  code: string;
  name: string;
  name_ar?: string | null;
  name_fr?: string | null;
  category: string;
  category_label?: string | null;
  supports_tracks: boolean;
  enabled: boolean;
  sequence?: number;
}

export interface LevelOptionsPayload {
  reference_levels: ReferenceLevel[];
  categories?: { code: string; label: string }[];
  permissions?: { can_view?: boolean; can_manage?: boolean };
}

export type EnableLevelResult = {
  reference_level_id: number;
  ok: boolean;
  error?: ApiErrorBody;
  level_id?: number;
};

export function useLevelOptions() {
  const state = useAdminResource<LevelOptionsPayload>(endpoints.admin.levelsOptions);
  return {
    options: state.data,
    loading: state.loading,
    error: state.error,
    unavailable: state.error?.code === 'not_found',
    reload: state.reload,
  };
}

export async function enableReferenceLevels(
  referenceLevelIds: number[],
): Promise<EnableLevelResult[]> {
  if (!referenceLevelIds.length) return [];

  const batchRes = await api.post<{ results?: EnableLevelResult[] }>(
    endpoints.admin.levelsEnable,
    { reference_level_ids: referenceLevelIds },
  );

  if (batchRes.success && Array.isArray(batchRes.data?.results)) {
    return batchRes.data.results;
  }

  if (batchRes.success) {
    return referenceLevelIds.map((id) => ({
      reference_level_id: id,
      ok: true,
    }));
  }

  if (batchRes.error?.code === 'not_found') {
    const err = batchRes.error;
    return referenceLevelIds.map((id) => ({
      reference_level_id: id,
      ok: false,
      error: err,
    }));
  }

  const results: EnableLevelResult[] = [];
  for (const referenceLevelId of referenceLevelIds) {
    const res = await api.post<{ id: number }>(endpoints.admin.levelsEnable, {
      reference_level_id: referenceLevelId,
    });
    results.push({
      reference_level_id: referenceLevelId,
      ok: res.success,
      error: res.success ? undefined : res.error,
      level_id: res.success ? res.data?.id : undefined,
    });
  }
  return results;
}

export function useEnableLevels() {
  const enable = useCallback(
    (ids: number[]) => enableReferenceLevels(ids),
    [],
  );
  return { enable };
}
