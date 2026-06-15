import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { GuardianRemovalImpact } from '@/types/student-360';
import { normalizeRemovalImpactFromRaw } from './guardian-removal-shared';

export async function fetchGuardianRemovalImpact(
  studentId: number,
  relationshipId: number,
): Promise<GuardianRemovalImpact | null> {
  const res = await api.get<GuardianRemovalImpact>(
    endpoints.admin.studentGuardianRemovalImpact(studentId, relationshipId),
  );
  if (!res.success) return null;
  return normalizeRemovalImpactFromRaw(res.data);
}

export async function removeGuardianRelationship(
  studentId: number,
  relationshipId: number,
  payload?: { notes?: string; date_end?: string },
) {
  const removeRes = await api.post(
    endpoints.admin.studentGuardianRemove(studentId, relationshipId),
    payload ?? {},
  );
  if (removeRes.success) return removeRes;

  const code = String(removeRes.error?.code ?? '');
  if (code === 'not_found') {
    return api.post(endpoints.admin.studentGuardianEnd(studentId, relationshipId), payload ?? {});
  }
  return removeRes;
}
