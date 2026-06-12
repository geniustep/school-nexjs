'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { LevelLinkResponse, LevelRemovalResponse } from '@/types/academic-levels';
import type { Level } from '@/types/class';
import type { ApiErrorBody, ListParams } from '@/types/api';

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
  const res = await api.delete<LevelRemovalResponse>(
    endpoints.admin.levelDelete(schoolLevelId),
    adminQuery(activeSchoolId),
  );

  if (res.success) return { ok: true, data: res.data };
  return { ok: false, error: res.error };
}

export async function fetchSchoolLevelDetail(
  levelId: number,
  activeSchoolId?: number | null,
): Promise<{ ok: true; data: Level } | { ok: false; error: ApiErrorBody }> {
  const res = await api.get<Level>(
    endpoints.admin.level(levelId),
    adminQuery(activeSchoolId),
  );

  if (res.success) return { ok: true, data: res.data };
  return { ok: false, error: res.error };
}
