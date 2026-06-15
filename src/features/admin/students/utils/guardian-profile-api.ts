import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeDeleteImpactFromRaw } from './guardian-delete-impact';
import type { GuardianDeleteImpact } from '@/types/student-360';

export async function fetchGuardianDeleteImpact(parentId: number): Promise<GuardianDeleteImpact | null> {
  const res = await api.get<unknown>(endpoints.admin.parentDeleteImpact(parentId));
  if (!res.success) return null;
  return normalizeDeleteImpactFromRaw(res.data);
}

export async function restoreGuardianProfile(parentId: number) {
  return api.post(endpoints.admin.parentRestore(parentId), {});
}

export async function deleteGuardianProfile(
  parentId: number,
  payload: { confirm: true; delete_orphan_person: boolean },
) {
  return api.post(endpoints.admin.parentDelete(parentId), payload);
}
