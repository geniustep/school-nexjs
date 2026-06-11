'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  LevelLinkResponse,
  LevelRemovalResponse,
} from '@/types/academic-levels';
import type { ApiError, ApiErrorBody, ListParams } from '@/types/api';

function adminQuery(activeSchoolId?: number | null): ListParams | undefined {
  return activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
}

export async function linkLegacySchoolLevel(
  schoolLevelId: number,
  referenceLevelId: number,
  activeSchoolId?: number | null,
): Promise<{ ok: true; data: LevelLinkResponse } | { ok: false; error: ApiErrorBody }> {
  const res = await api.post<LevelLinkResponse>(
    endpoints.admin.levelLinkReference(schoolLevelId),
    { reference_level_id: referenceLevelId },
    adminQuery(activeSchoolId),
  );

  if (res.success) return { ok: true, data: res.data };
  return { ok: false, error: res.error };
}

export async function removeSchoolLevel(
  schoolLevelId: number,
  activeSchoolId?: number | null,
): Promise<{ ok: true; data: LevelRemovalResponse } | { ok: false; error: ApiErrorBody }> {
  const query = adminQuery(activeSchoolId);

  const del = await api.delete<LevelRemovalResponse>(
    endpoints.admin.level(schoolLevelId),
    query,
  );

  if (del.success) return { ok: true, data: del.data };

  const code = String(del.error?.code ?? '');
  if (code === 'server_error' || code === 'not_found') {
    const archived = await api.post<LevelRemovalResponse>(
      endpoints.admin.levelArchive(schoolLevelId),
      undefined,
      query,
    );
    if (archived.success) {
      return {
        ok: true,
        data: {
          action: 'deactivated',
          id: schoolLevelId,
          reason: 'historical_data_preserved',
        },
      };
    }
    const partial = (archived as ApiError & { data?: LevelRemovalResponse }).data;
    if (partial?.action) return { ok: true, data: partial };
    return { ok: false, error: archived.error };
  }

  const partial = (del as ApiError & { data?: LevelRemovalResponse }).data;
  if (partial?.action) return { ok: true, data: partial };

  return { ok: false, error: del.error };
}
