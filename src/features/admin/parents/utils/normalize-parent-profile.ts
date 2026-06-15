import type { Parent, ParentChild, ParentChildRelationship } from '@/types/parent';
import { getGuardianEmailPresentation } from '@/features/admin/students/utils/guardian-email-presentation';
import {
  normalizeAllowedActionsFromRaw,
  normalizeRemovalImpactFromRaw,
} from '@/features/admin/students/utils/guardian-removal-shared';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return list.length ? list : undefined;
}

function readEmail(raw: Record<string, unknown>): string | null {
  if (raw.email === false || raw.email == null) return null;
  if (typeof raw.email !== 'string') return null;
  const presentation = getGuardianEmailPresentation(raw.email);
  return presentation.kind === 'usable' ? presentation.email : null;
}

function normalizeChildRelationship(raw: unknown): ParentChildRelationship | null {
  const record = asRecord(raw);
  if (!record) return null;
  if (typeof record.relationship_id !== 'number' && !record.relationship_type) return null;
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
    state: typeof record.state === 'string' ? record.state : undefined,
    active: record.active !== false,
    allowed_actions: normalizeAllowedActionsFromRaw(record.allowed_actions),
    removal_impact: normalizeRemovalImpactFromRaw(record.removal_impact) ?? undefined,
  };
}

function normalizeChild(raw: unknown): ParentChild | null {
  const record = asRecord(raw);
  if (!record || typeof record.id !== 'number') return null;

  const name =
    (typeof record.display_name === 'string' && record.display_name.trim()) ||
    (typeof record.full_name === 'string' && record.full_name.trim()) ||
    (typeof record.name === 'string' && record.name.trim()) ||
    [record.first_name, record.last_name].filter((p) => typeof p === 'string' && p.trim()).join(' ').trim() ||
    '';

  const relationship =
    normalizeChildRelationship(record.relationship) ??
    normalizeChildRelationship(record.guardian_relationship) ??
    (typeof record.relationship_id === 'number' || record.relationship_type
      ? normalizeChildRelationship(record)
      : null);

  return {
    id: record.id,
    first_name: typeof record.first_name === 'string' ? record.first_name : undefined,
    last_name: typeof record.last_name === 'string' ? record.last_name : undefined,
    full_name: typeof record.full_name === 'string' ? record.full_name : undefined,
    name,
    code: typeof record.code === 'string' ? record.code : null,
    school_number: typeof record.school_number === 'string' ? record.school_number : null,
    class:
      record.class && typeof record.class === 'object'
        ? (record.class as ParentChild['class'])
        : null,
    level:
      record.level && typeof record.level === 'object'
        ? (record.level as ParentChild['level'])
        : null,
    relationship,
  };
}

/** Normalize GET /admin/parents/{id} into unified person profile. */
export function normalizeParentProfile(data: unknown): Parent | null {
  const raw = asRecord(data);
  if (!raw || typeof raw.id !== 'number') return null;

  const person = asRecord(raw.person) ?? raw;
  const name =
    (typeof person.display_name === 'string' && person.display_name.trim()) ||
    (typeof person.full_name === 'string' && person.full_name.trim()) ||
    (typeof person.name === 'string' && person.name.trim()) ||
    (typeof raw.name === 'string' && raw.name.trim()) ||
    '';

  const hasUserAccount =
    person.has_user_account === true ||
    raw.has_user_account === true ||
    raw.has_account === true ||
    (typeof person.user_id === 'number' && person.user_id > 0) ||
    (typeof raw.user_id === 'number' && raw.user_id > 0);

  const childrenRaw = raw.children ?? raw.linked_students ?? raw.student_links;
  const children = Array.isArray(childrenRaw)
    ? childrenRaw.map(normalizeChild).filter((c): c is ParentChild => c != null)
    : undefined;

  return {
    id: raw.id,
    name,
    display_name: typeof person.display_name === 'string' ? person.display_name : name,
    phone:
      (typeof person.phone === 'string' ? person.phone : null) ??
      (typeof person.mobile === 'string' ? person.mobile : null) ??
      (typeof raw.phone === 'string' ? raw.phone : null),
    email: readEmail(person) ?? readEmail(raw),
    address:
      typeof person.address === 'string'
        ? person.address
        : typeof raw.address === 'string'
          ? raw.address
          : null,
    login: typeof raw.login === 'string' ? raw.login : null,
    user_id:
      typeof person.user_id === 'number'
        ? person.user_id
        : typeof raw.user_id === 'number'
          ? raw.user_id
          : null,
    has_account: hasUserAccount,
    has_user_account: hasUserAccount,
    needs_new_account:
      typeof raw.needs_new_account === 'boolean'
        ? raw.needs_new_account
        : typeof person.needs_new_account === 'boolean'
          ? person.needs_new_account
          : !hasUserAccount,
    account:
      raw.account && typeof raw.account === 'object'
        ? (raw.account as Parent['account'])
        : null,
    relation: typeof raw.relation === 'string' ? raw.relation : null,
    existing_roles: readStringList(person.existing_roles) ?? readStringList(raw.existing_roles),
    role_labels: readStringList(person.role_labels) ?? readStringList(raw.role_labels),
    partner_id: typeof person.partner_id === 'number' ? person.partner_id : undefined,
    teacher_id: typeof person.teacher_id === 'number' ? person.teacher_id : null,
    preferred_language:
      typeof person.preferred_language === 'string'
        ? person.preferred_language
        : typeof raw.preferred_language === 'string'
          ? raw.preferred_language
          : null,
    notification_opt_in: raw.notification_opt_in === true,
    children,
    linked_students_count:
      typeof raw.linked_students_count === 'number'
        ? raw.linked_students_count
        : children?.length,
    other_children_count:
      typeof raw.other_children_count === 'number' ? raw.other_children_count : undefined,
    status: String(raw.status ?? 'active'),
    needs_review: raw.needs_review === true || person.needs_review === true || undefined,
    allowed_actions: normalizeAllowedActionsFromRaw(raw.allowed_actions ?? person.allowed_actions),
  };
}

export function preferredLanguageLabel(t: (key: string) => string, code: string | null | undefined): string {
  if (!code) return t('common.dash');
  const key = `admin.preferredLanguages.${code}`;
  const label = t(key);
  return label !== key ? label : code;
}
