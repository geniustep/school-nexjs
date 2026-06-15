import type { PersonSearchResult } from '@/types/student-360';
import { normalizeAllowedActionsFromRaw } from './guardian-removal-shared';
import { normalizeDeleteImpactFromRaw } from './guardian-delete-impact';
import { getGuardianEmailPresentation } from './guardian-email-presentation';
import { isPersonArchived } from './guardian-profile-contract';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readEmail(raw: Record<string, unknown>): string | null {
  if (raw.email === false || raw.email == null) return null;
  if (typeof raw.email !== 'string') return null;
  const presentation = getGuardianEmailPresentation(raw.email);
  return presentation.kind === 'usable' ? presentation.email : null;
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function readHasUserAccount(raw: Record<string, unknown>): boolean {
  if (raw.has_user_account === true || raw.has_account === true) return true;
  if (typeof raw.user_id === 'number' && raw.user_id > 0) return true;
  const account = asRecord(raw.account);
  return typeof account?.user_id === 'number' && account.user_id > 0;
}

function resolveStatus(raw: Record<string, unknown>): string | undefined {
  if (typeof raw.status === 'string' && raw.status.trim()) return raw.status.trim();
  if (raw.archived === true) return 'archived';
  if (raw.active === false) return 'archived';
  if (raw.active === true) return 'active';
  return undefined;
}

/** Map unified person search row from GET /admin/guardians/search. */
export function normalizePersonSearchResult(data: unknown): PersonSearchResult | null {
  const raw = asRecord(data);
  if (!raw || typeof raw.partner_id !== 'number') return null;

  const guardianId =
    typeof raw.guardian_id === 'number'
      ? raw.guardian_id
      : typeof raw.id === 'number'
        ? raw.id
        : null;

  const name =
    (typeof raw.display_name === 'string' && raw.display_name.trim()) ||
    (typeof raw.name === 'string' && raw.name.trim()) ||
    (typeof raw.full_name === 'string' && raw.full_name.trim()) ||
    '';

  const hasUserAccount = readHasUserAccount(raw);
  const existingRoles = readStringList(raw.existing_roles);
  const roleLabels = readStringList(raw.role_labels);
  const status = resolveStatus(raw);
  const archived = raw.archived === true || status === 'archived';
  const active = archived ? false : raw.active !== false && status !== 'archived';
  const allowedActions = normalizeAllowedActionsFromRaw(raw.allowed_actions);
  const deleteImpact = normalizeDeleteImpactFromRaw(raw.delete_impact ?? raw);

  let canLink = false;
  if (!archived) {
    if (allowedActions?.link_as_guardian === true) canLink = true;
    else if (allowedActions?.link_as_guardian !== false && raw.can_link_as_guardian === true) canLink = true;
    else if (allowedActions?.link_as_guardian === undefined && raw.can_link_as_guardian !== false) {
      canLink = raw.can_link_as_guardian !== false;
    }
  }

  return {
    partner_id: raw.partner_id,
    person_id: typeof raw.person_id === 'number' ? raw.person_id : undefined,
    id: guardianId ?? raw.partner_id,
    guardian_id: guardianId,
    teacher_id: typeof raw.teacher_id === 'number' ? raw.teacher_id : null,
    user_id: typeof raw.user_id === 'number' ? raw.user_id : null,
    name,
    phone:
      (typeof raw.phone === 'string' ? raw.phone : null) ??
      (typeof raw.mobile === 'string' ? raw.mobile : null),
    secondary_phone: typeof raw.secondary_phone === 'string' ? raw.secondary_phone : null,
    email: readEmail(raw),
    address: typeof raw.address === 'string' ? raw.address : null,
    national_id:
      typeof raw.national_id === 'string'
        ? raw.national_id
        : typeof raw.id_number === 'string'
          ? raw.id_number
          : null,
    children_count:
      typeof raw.children_count === 'number'
        ? raw.children_count
        : typeof raw.linked_students_count === 'number'
          ? raw.linked_students_count
          : undefined,
    existing_roles: existingRoles,
    role_labels: roleLabels,
    has_user_account: hasUserAccount,
    has_account: hasUserAccount,
    active,
    archived,
    status: status ?? (archived ? 'archived' : 'active'),
    archive_reason: typeof raw.archive_reason === 'string' ? raw.archive_reason : null,
    allowed_actions: allowedActions,
    delete_impact: deleteImpact ?? undefined,
    can_link_as_guardian: canLink,
    already_guardian_of_student: raw.already_guardian_of_student === true,
  };
}

export function normalizePersonSearchList(data: unknown): PersonSearchResult[] {
  if (Array.isArray(data)) {
    return data.map(normalizePersonSearchResult).filter((p): p is PersonSearchResult => p != null);
  }
  const raw = asRecord(data);
  if (Array.isArray(raw?.items)) {
    return raw.items
      .map(normalizePersonSearchResult)
      .filter((p): p is PersonSearchResult => p != null);
  }
  return [];
}

export function isPersonSearchResult(
  value: PersonSearchResult | import('@/types/student-360').GuardianSummary,
): value is PersonSearchResult {
  return typeof (value as PersonSearchResult).partner_id === 'number';
}

export { isPersonArchived };
