import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { GuardianRelationshipDetailResponse } from '@/types/student-360';
import { normalizeGuardianRelationship } from './normalize-guardian-relationship';
import {
  normalizeAllowedActionsFromRaw,
  normalizeRemovalImpactFromRaw,
} from './guardian-removal-shared';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** GET /admin/students/{studentId}/guardians/{relationshipId} — live Odoo 18.0.1.0.99 contract. */
export async function fetchGuardianRelationshipDetail(
  studentId: number,
  relationshipId: number,
): Promise<GuardianRelationshipDetailResponse | null> {
  const res = await api.get<unknown>(
    endpoints.admin.studentGuardianRelationship(studentId, relationshipId),
  );
  if (!res.success || !res.data) return null;

  const raw = asRecord(res.data);
  if (!raw) return null;

  const relationship = normalizeGuardianRelationship(raw);
  if (!relationship) return null;

  const allowed_actions =
    normalizeAllowedActionsFromRaw(raw.allowed_actions) ?? relationship.allowed_actions;
  const removal_impact =
    normalizeRemovalImpactFromRaw(raw.removal_impact) ?? relationship.removal_impact;

  const accountRaw = asRecord(raw.account);
  const account = accountRaw
    ? {
        has_user_account: accountRaw.has_user_account === true,
        needs_new_account:
          typeof accountRaw.needs_new_account === 'boolean'
            ? accountRaw.needs_new_account
            : undefined,
        can_assign_password:
          typeof accountRaw.can_assign_password === 'boolean'
            ? accountRaw.can_assign_password
            : undefined,
        roles: Array.isArray(accountRaw.roles)
          ? accountRaw.roles.filter((r): r is string => typeof r === 'string')
          : undefined,
        user_id: typeof accountRaw.user_id === 'number' ? accountRaw.user_id : undefined,
      }
    : undefined;

  return {
    relationship: {
      ...relationship,
      allowed_actions,
      removal_impact,
    },
    allowed_actions,
    removal_impact,
    account,
  };
}

export interface RemoveGuardianRelationshipPayload {
  confirm: boolean;
  reason?: string;
}

export function buildDetachRelationshipPayload(
  confirm: boolean,
  reason?: string,
): RemoveGuardianRelationshipPayload {
  const trimmed = reason?.trim();
  return {
    confirm,
    reason: trimmed || undefined,
  };
}

/** POST /api/v1/admin/students/{student_id}/guardians/{relationship_id}/remove */
export async function removeGuardianRelationship(
  studentId: number,
  relationshipId: number,
  payload: RemoveGuardianRelationshipPayload,
) {
  return api.post(endpoints.admin.studentGuardianRemove(studentId, relationshipId), payload);
}

/** @deprecated Use fetchGuardianRelationshipDetail */
export async function fetchGuardianRemovalImpact(studentId: number, relationshipId: number) {
  const detail = await fetchGuardianRelationshipDetail(studentId, relationshipId);
  return detail?.removal_impact ?? null;
}
