'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ClassRemovalResponse, SchoolClass } from '@/types/class';
import type { ApiErrorBody, ListParams } from '@/types/api';

function adminQuery(activeSchoolId?: number | null): ListParams | undefined {
  return activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
}

export async function fetchSchoolClassDetail(
  classId: number,
  activeSchoolId?: number | null,
): Promise<{ ok: true; data: SchoolClass } | { ok: false; error: ApiErrorBody }> {
  const res = await api.get<SchoolClass>(
    endpoints.admin.class(classId),
    adminQuery(activeSchoolId),
  );

  if (res.success) return { ok: true, data: res.data };
  return { ok: false, error: res.error };
}

export async function removeSchoolClass(
  classId: number,
  activeSchoolId?: number | null,
): Promise<{ ok: true; data: ClassRemovalResponse } | { ok: false; error: ApiErrorBody }> {
  const res = await api.delete<ClassRemovalResponse>(
    endpoints.admin.classDelete(classId),
    adminQuery(activeSchoolId),
  );

  if (res.success) return { ok: true, data: res.data };
  return { ok: false, error: res.error };
}
