import type { GuardianRelationship } from '@/types/student-360';
import { normalizeGuardianSummary } from './normalize-guardian';
import {
  canDetachGuardianRelationship,
  normalizeAllowedActionsFromRaw,
  normalizeRemovalImpactFromRaw,
} from './guardian-removal-shared';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export { normalizeRemovalImpactFromRaw as normalizeGuardianRemovalImpact } from './guardian-removal-shared';

export function normalizeGuardianRelationship(data: unknown): GuardianRelationship | null {
  const raw = asRecord(data);
  if (!raw || typeof raw.relationship_id !== 'number') return null;

  const guardianRaw = raw.guardian ?? raw;
  const guardian = normalizeGuardianSummary(guardianRaw);
  if (!guardian) return null;

  const allowedActions =
    normalizeAllowedActionsFromRaw(raw.allowed_actions) ??
    normalizeAllowedActionsFromRaw(asRecord(guardianRaw)?.allowed_actions);

  return {
    relationship_id: raw.relationship_id,
    guardian,
    relationship_type: String(raw.relationship_type ?? 'other'),
    is_primary_contact: raw.is_primary_contact === true,
    is_legal_guardian: raw.is_legal_guardian === true,
    is_financial_responsible: raw.is_financial_responsible === true,
    receives_notifications: raw.receives_notifications !== false,
    is_emergency_contact: raw.is_emergency_contact === true,
    is_authorized_pickup: raw.is_authorized_pickup === true,
    contact_priority:
      typeof raw.contact_priority === 'number' ? raw.contact_priority : null,
    date_start: typeof raw.date_start === 'string' ? raw.date_start : null,
    date_end: typeof raw.date_end === 'string' ? raw.date_end : null,
    state: String(raw.state ?? 'active'),
    active: raw.active !== false,
    notes: typeof raw.notes === 'string' ? raw.notes : null,
    allowed_actions: allowedActions,
    removal_impact: normalizeRemovalImpactFromRaw(raw.removal_impact) ?? undefined,
    needs_review: raw.needs_review === true || undefined,
  };
}

export function normalizeGuardianRelationshipList(data: unknown): GuardianRelationship[] {
  if (Array.isArray(data)) {
    return data.map(normalizeGuardianRelationship).filter((r): r is GuardianRelationship => r != null);
  }
  const raw = asRecord(data);
  if (Array.isArray(raw?.items)) {
    return raw.items
      .map(normalizeGuardianRelationship)
      .filter((r): r is GuardianRelationship => r != null);
  }
  return [];
}

export function canRemoveGuardianRelationship(
  rel: GuardianRelationship,
  canManage: boolean,
): boolean {
  return canDetachGuardianRelationship(rel.allowed_actions, canManage);
}
