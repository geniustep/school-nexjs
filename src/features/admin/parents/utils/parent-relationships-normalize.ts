import type { ParentChild, ParentChildRelationship } from '@/types/parent';
import { isRelationshipActive } from '@/features/admin/students/utils/relationship-types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** Unified Odoo 18.0.1.0.99+ parent profile exposes at least one of these keys. */
export function usesUnifiedParentContract(raw: Record<string, unknown>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(raw, 'relationships') ||
    Object.prototype.hasOwnProperty.call(raw, 'person') ||
    Object.prototype.hasOwnProperty.call(raw, 'guardian_profile')
  );
}

export function hasRelationshipsContract(raw: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(raw, 'relationships');
}

const INACTIVE_STATES = new Set([
  'ended',
  'inactive',
  'archived',
  'cancelled',
  'canceled',
  'removed',
  'deleted',
]);

function readLifecycleState(record: Record<string, unknown>): string {
  const candidates = [record.state, record.status, record.relationship_status];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim().toLowerCase();
    }
  }
  return 'active';
}

function hasEndedTimestamp(record: Record<string, unknown>): boolean {
  const endedAt = record.ended_at ?? record.end_date ?? record.date_end;
  return typeof endedAt === 'string' && endedAt.trim().length > 0;
}

/** Active guardian link — filters ended/archived/inactive per live Odoo contract fields. */
export function isActiveGuardianRelationship(raw: unknown): boolean {
  const record = asRecord(raw);
  if (!record) return false;

  if (record.is_active === false) return false;
  if (record.active === false) return false;

  const lifecycle = readLifecycleState(record);
  if (INACTIVE_STATES.has(lifecycle)) return false;
  if (hasEndedTimestamp(record)) return false;

  const explicitActive =
    record.active === true ? true : record.active === false ? false : undefined;

  return isRelationshipActive(lifecycle || 'active', explicitActive);
}

export function warnIgnoredLegacyStudents(
  raw: Record<string, unknown>,
  activeCount: number,
): void {
  if (process.env.NODE_ENV !== 'development') return;
  if (!hasRelationshipsContract(raw)) return;
  if (activeCount > 0) return;

  const legacyRaw = raw.children ?? raw.linked_students ?? raw.student_links ?? raw.students;
  if (!Array.isArray(legacyRaw) || legacyRaw.length === 0) return;

  console.warn(
    '[parent-profile] Unified parent contract returned no active relationships; legacy student lists were ignored.',
  );
}

export function filterActiveRelationshipChild(
  child: ParentChild,
  requireRelationshipId: boolean,
): boolean {
  const rel = child.relationship;
  if (!rel) return !requireRelationshipId;
  if (requireRelationshipId && typeof rel.relationship_id !== 'number') return false;
  return isActiveGuardianRelationship(rel);
}

export function normalizeRelationshipLifecycle(raw: unknown): ParentChildRelationship | null {
  const record = asRecord(raw);
  if (!record) return null;
  if (typeof record.relationship_id !== 'number' && !record.relationship_type) return null;

  const lifecycle = readLifecycleState(record);
  const explicitActive =
    record.active === true ? true : record.active === false ? false : undefined;
  const active = isActiveGuardianRelationship(record);

  return {
    relationship_id: typeof record.relationship_id === 'number' ? record.relationship_id : undefined,
    relationship_type:
      typeof record.relationship_type === 'string' ? record.relationship_type : undefined,
    is_primary_contact: record.is_primary_contact === true,
    is_legal_guardian: record.is_legal_guardian === true,
    is_financial_responsible: record.is_financial_responsible === true,
    is_emergency_contact: record.is_emergency_contact === true,
    receives_notifications: record.receives_notifications === true,
    is_authorized_pickup: record.is_authorized_pickup === true,
    state: typeof record.state === 'string' ? record.state : lifecycle,
    active: explicitActive !== undefined ? explicitActive : active,
    allowed_actions: undefined,
    removal_impact: undefined,
  };
}
