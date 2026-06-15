import type { Parent, ParentChild, ParentChildRelationship, ParentAccountInfo, ParentGuardianProfile } from '@/types/parent';
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

function readAddress(raw: Record<string, unknown>): string | null {
  const street = typeof raw.street === 'string' ? raw.street.trim() : '';
  const city = typeof raw.city === 'string' ? raw.city.trim() : '';
  if (street && city) return `${street}, ${city}`;
  return street || city || (typeof raw.address === 'string' ? raw.address : null);
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

function normalizeRelationshipAsChild(raw: unknown): ParentChild | null {
  const record = asRecord(raw);
  if (!record) return null;
  const studentId =
    typeof record.student_id === 'number'
      ? record.student_id
      : typeof record.id === 'number'
        ? record.id
        : null;
  if (studentId == null) return null;

  const name =
    (typeof record.student_name === 'string' && record.student_name.trim()) ||
    (typeof record.display_name === 'string' && record.display_name.trim()) ||
    (typeof record.full_name === 'string' && record.full_name.trim()) ||
    (typeof record.name === 'string' && record.name.trim()) ||
    '';

  const classValue = record.class;
  const levelValue = record.level;

  return {
    id: studentId,
    name,
    code: typeof record.student_code === 'string' ? record.student_code : null,
    school_number: typeof record.student_code === 'string' ? record.student_code : null,
    class:
      typeof classValue === 'string'
        ? { id: typeof record.class_id === 'number' ? record.class_id : 0, name: classValue }
        : classValue && typeof classValue === 'object'
          ? (classValue as ParentChild['class'])
          : null,
    level:
      typeof levelValue === 'string'
        ? { id: 0, name: levelValue }
        : levelValue && typeof levelValue === 'object'
          ? (levelValue as ParentChild['level'])
          : null,
    relationship: normalizeChildRelationship(record),
  };
}

function normalizeLegacyChild(raw: unknown): ParentChild | null {
  const record = asRecord(raw);
  if (!record || typeof record.id !== 'number') return null;

  const name =
    (typeof record.display_name === 'string' && record.display_name.trim()) ||
    (typeof record.full_name === 'string' && record.full_name.trim()) ||
    (typeof record.name === 'string' && record.name.trim()) ||
    [record.first_name, record.last_name].filter((p) => typeof p === 'string' && p.trim()).join(' ').trim() ||
    '';

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
    relationship:
      normalizeChildRelationship(record.relationship) ??
      normalizeChildRelationship(record.guardian_relationship) ??
      null,
  };
}

function normalizeAccount(raw: unknown): ParentAccountInfo | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    has_user_account: record.has_user_account === true,
    user_id: typeof record.user_id === 'number' ? record.user_id : null,
    needs_new_account:
      typeof record.needs_new_account === 'boolean' ? record.needs_new_account : undefined,
    can_assign_password:
      typeof record.can_assign_password === 'boolean' ? record.can_assign_password : undefined,
    roles: readStringList(record.roles),
  };
}

function normalizeGuardianProfile(raw: unknown): ParentGuardianProfile | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    guardian_id:
      typeof record.guardian_id === 'number'
        ? record.guardian_id
        : typeof record.id === 'number'
          ? record.id
          : undefined,
    status: typeof record.status === 'string' ? record.status : undefined,
    archivable: record.archivable === true,
    archive_blockers: readStringList(record.archive_blockers),
  };
}

/** Normalize GET /admin/parents/{id} — Odoo 18.0.1.0.99 unified person contract. */
export function normalizeParentProfile(data: unknown): Parent | null {
  const raw = asRecord(data);
  if (!raw || typeof raw.id !== 'number') return null;

  const person = asRecord(raw.person);
  const accountInfo = normalizeAccount(raw.account);
  const guardianProfile = normalizeGuardianProfile(raw.guardian_profile);

  const name =
    (person && typeof person.display_name === 'string' && person.display_name.trim()) ||
    (person && typeof person.name === 'string' && person.name.trim()) ||
    (typeof raw.name === 'string' && raw.name.trim()) ||
    '';

  const hasUserAccount =
    accountInfo?.has_user_account === true ||
    person?.has_user_account === true ||
    raw.has_user_account === true ||
    raw.has_account === true ||
    (typeof accountInfo?.user_id === 'number' && accountInfo.user_id > 0) ||
    (typeof raw.user_id === 'number' && raw.user_id > 0);

  const needsNewAccount =
    accountInfo?.needs_new_account ??
    (typeof raw.needs_new_account === 'boolean' ? raw.needs_new_account : !hasUserAccount);

  const relationshipsRaw = raw.relationships;
  const relationshipsChildren = Array.isArray(relationshipsRaw)
    ? relationshipsRaw.map(normalizeRelationshipAsChild).filter((c): c is ParentChild => c != null)
    : [];

  const legacyChildrenRaw = raw.children ?? raw.linked_students ?? raw.student_links;
  const legacyChildren = Array.isArray(legacyChildrenRaw)
    ? legacyChildrenRaw.map(normalizeLegacyChild).filter((c): c is ParentChild => c != null)
    : [];

  const children = relationshipsChildren.length ? relationshipsChildren : legacyChildren;

  const allowedActions =
    normalizeAllowedActionsFromRaw(raw.allowed_actions) ??
    (guardianProfile?.archivable ? { archive_guardian_profile: true } : undefined);

  const roleLabels =
    (person ? readStringList(person.role_labels) : undefined) ??
    readStringList(raw.role_labels) ??
    accountInfo?.roles;

  const existingRoles =
    (person ? readStringList(person.existing_roles) : undefined) ?? readStringList(raw.existing_roles);

  return {
    id: raw.id,
    name,
    display_name: person?.display_name && typeof person.display_name === 'string' ? person.display_name : name,
    phone:
      (person && typeof person.phone === 'string' ? person.phone : null) ??
      (typeof raw.phone === 'string' ? raw.phone : null),
    mobile:
      (person && typeof person.mobile === 'string' ? person.mobile : null) ??
      (typeof raw.mobile === 'string' ? raw.mobile : null),
    email: (person ? readEmail(person) : null) ?? readEmail(raw),
    street:
      ((person && typeof person.street === 'string' ? person.street.trim() : null) ??
        (typeof raw.street === 'string' ? raw.street.trim() : null)) ||
      undefined,
    city:
      ((person && typeof person.city === 'string' ? person.city.trim() : null) ??
        (typeof raw.city === 'string' ? raw.city.trim() : null)) ||
      undefined,
    address: (person ? readAddress(person) : null) ?? readAddress(raw),
    login: typeof raw.login === 'string' ? raw.login : null,
    user_id: accountInfo?.user_id ?? (typeof raw.user_id === 'number' ? raw.user_id : null),
    has_account: hasUserAccount,
    has_user_account: hasUserAccount,
    needs_new_account: needsNewAccount,
    account: accountInfo,
    guardian_profile: guardianProfile,
    relation: typeof raw.relation === 'string' ? raw.relation : null,
    existing_roles: existingRoles,
    role_labels: roleLabels,
    partner_id: person && typeof person.partner_id === 'number' ? person.partner_id : undefined,
    person_id: person && typeof person.person_id === 'number' ? person.person_id : undefined,
    teacher_id: person && typeof person.teacher_id === 'number' ? person.teacher_id : null,
    can_delete_person: person?.can_delete_person === true ? true : person?.can_delete_person === false ? false : undefined,
    preferred_language:
      typeof raw.preferred_language === 'string'
        ? raw.preferred_language
        : person && typeof person.preferred_language === 'string'
          ? person.preferred_language
          : null,
    notification_opt_in: raw.notification_opt_in === true,
    children,
    relationships: relationshipsChildren.length ? relationshipsChildren : undefined,
    linked_students_count:
      typeof raw.linked_students_count === 'number'
        ? raw.linked_students_count
        : children.length,
    other_children_count:
      typeof raw.other_children_count === 'number' ? raw.other_children_count : undefined,
    status: String(guardianProfile?.status ?? raw.status ?? 'active'),
    needs_review: raw.needs_review === true || person?.needs_review === true || undefined,
    allowed_actions: allowedActions,
  };
}

export function preferredLanguageLabel(t: (key: string) => string, code: string | null | undefined): string {
  if (!code) return t('common.dash');
  const key = `admin.preferredLanguages.${code}`;
  const label = t(key);
  return label !== key ? label : code;
}

/** Map unified parent profile to legacy account panel entity fields. */
export function parentAccountEntityFields(parent: Parent): import('@/types/account').AccountEntityFields & {
  id: number;
} {
  const userId = parent.account?.user_id ?? parent.user_id ?? null;
  const email = parent.email;
  const login = parent.login ?? null;

  if (parent.legacy_account) {
    return {
      id: parent.id,
      email,
      login,
      user_id: userId,
      account: parent.legacy_account,
    };
  }

  if (parent.account?.has_user_account && userId) {
    return {
      id: parent.id,
      email,
      login,
      user_id: userId,
      account_status: 'active',
      status: 'active',
    };
  }

  return { id: parent.id, email, login, user_id: userId };
}
