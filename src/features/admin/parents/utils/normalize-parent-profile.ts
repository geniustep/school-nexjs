import type { Parent, ParentChild, ParentAccountInfo, ParentGuardianProfile } from '@/types/parent';
import { getGuardianEmailPresentation } from '@/features/admin/students/utils/guardian-email-presentation';
import { normalizeAllowedActionsFromRaw, normalizeRemovalImpactFromRaw } from '@/features/admin/students/utils/guardian-removal-shared';
import { normalizeDeleteImpactFromRaw } from '@/features/admin/students/utils/guardian-delete-impact';
import { readIdentityDocumentFields } from './identity-document';
import {
  filterActiveRelationshipChild,
  hasRelationshipsContract,
  isActiveGuardianRelationship,
  normalizeRelationshipLifecycle,
  usesUnifiedParentContract,
  warnIgnoredLegacyStudents,
} from './parent-relationships-normalize';

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

function normalizeChildRelationship(raw: unknown): ParentChild['relationship'] | null {
  const record = asRecord(raw);
  if (!record) return null;
  const lifecycle = normalizeRelationshipLifecycle(record);
  if (!lifecycle) return null;
  return {
    ...lifecycle,
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

  const relationship = normalizeChildRelationship(record);
  if (!relationship) return null;

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
    relationship,
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

  const relationship =
    normalizeChildRelationship(record.relationship) ??
    normalizeChildRelationship(record.guardian_relationship) ??
    null;

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

function resolveActiveChildren(raw: Record<string, unknown>): ParentChild[] {
  const unified = usesUnifiedParentContract(raw);
  const hasRelationshipsKey = hasRelationshipsContract(raw);

  if (hasRelationshipsKey) {
    const relationshipsRaw = raw.relationships;
    const mapped = Array.isArray(relationshipsRaw)
      ? relationshipsRaw.map(normalizeRelationshipAsChild).filter((c): c is ParentChild => c != null)
      : [];

    const active = mapped.filter((child) =>
      filterActiveRelationshipChild(child, true),
    );

    warnIgnoredLegacyStudents(raw, active.length);
    return active;
  }

  if (unified) {
    warnIgnoredLegacyStudents(raw, 0);
    return [];
  }

  const legacyChildrenRaw =
    raw.children ?? raw.linked_students ?? raw.student_links ?? raw.students ?? raw.student_ids;
  const legacyChildren = Array.isArray(legacyChildrenRaw)
    ? legacyChildrenRaw.map(normalizeLegacyChild).filter((c): c is ParentChild => c != null)
    : [];

  return legacyChildren.filter((child) => {
    if (!child.relationship) return true;
    return isActiveGuardianRelationship(child.relationship);
  });
}


function readNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
    password_was_set:
      typeof record.password_was_set === 'boolean' ? record.password_was_set : undefined,
    roles: readStringList(record.roles),
    login: readNullableString(record.login),
    status: readNullableString(record.status),
  };
}

function readBlockerCodes(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const codes = value
    .map((item): string | null => {
      if (typeof item === 'string' && item.trim()) return item;
      const record = asRecord(item);
      return record && typeof record.code === 'string' ? record.code : null;
    })
    .filter((item): item is string => item != null);
  return codes.length ? codes : undefined;
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
    archived: record.archived === true,
    archivable: record.archivable === true,
    archive_blockers: readStringList(record.archive_blockers) ?? readBlockerCodes(record.archive_blockers),
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

  const activeChildren = resolveActiveChildren(raw);
  const hasRelationshipsKey = hasRelationshipsContract(raw);

  const allowedActions =
    normalizeAllowedActionsFromRaw(raw.allowed_actions) ??
    (guardianProfile?.archivable ? { archive_guardian_profile: true } : undefined);

  const profileStatus = String(guardianProfile?.status ?? raw.status ?? 'active');
  const archived =
    raw.archived === true || guardianProfile?.archived === true || profileStatus === 'archived';
  const deleteImpact = normalizeDeleteImpactFromRaw(raw.delete_impact);
  const allowedActionsRaw = asRecord(raw.allowed_actions);
  const deleteBlockers =
    readStringList(raw.delete_blockers) ??
    readBlockerCodes(allowedActionsRaw?.delete_blockers) ??
    deleteImpact?.blockers?.map((blocker) => blocker.code);

  const roleLabels =
    (person ? readStringList(person.role_labels) : undefined) ??
    readStringList(raw.role_labels) ??
    accountInfo?.roles;

  const existingRoles =
    (person ? readStringList(person.existing_roles) : undefined) ?? readStringList(raw.existing_roles);

  const guardianCode =
    readNullableString(raw.code) ??
    (person ? readNullableString(person.code) : null);

  const rootLogin = readNullableString(raw.login) ?? (person ? readNullableString(person.login) : null);

  const identitySource = person ?? raw;
  const identity = readIdentityDocumentFields(identitySource);
  const rootIdentity = readIdentityDocumentFields(raw);

  return {
    id: raw.id,
    code: guardianCode,
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
    identity_document_type: identity.identity_document_type ?? rootIdentity.identity_document_type,
    identity_document_number:
      identity.identity_document_number ?? rootIdentity.identity_document_number,
    identity_document_country:
      identity.identity_document_country ?? rootIdentity.identity_document_country,
    national_id_masked: identity.national_id_masked ?? rootIdentity.national_id_masked,
    identity_document_number_masked:
      identity.identity_document_number_masked ?? rootIdentity.identity_document_number_masked,
    national_id: identity.national_id ?? rootIdentity.national_id,
    login: accountInfo?.login ?? rootLogin,
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
    children: activeChildren,
    relationships: hasRelationshipsKey ? activeChildren : activeChildren.length ? activeChildren : undefined,
    linked_students_count:
      typeof raw.linked_students_count === 'number'
        ? raw.linked_students_count
        : activeChildren.length,
    other_children_count:
      typeof raw.other_children_count === 'number' ? raw.other_children_count : undefined,
    status: profileStatus,
    archived,
    archive_reason: typeof raw.archive_reason === 'string' ? raw.archive_reason : null,
    delete_impact: deleteImpact ?? undefined,
    delete_blockers: deleteBlockers,
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

/**
 * Normalize a row from GET /admin/parents list.
 * List payloads may ship legacy `children` while unified `relationships` is empty — unlike detail profile.
 */
export function normalizeParentListItem(data: unknown): Parent | null {
  const parent = normalizeParentProfile(data);
  if (!parent) return null;
  if ((parent.children?.length ?? 0) > 0) return parent;

  const raw = asRecord(data);
  if (!raw) return parent;

  const legacyRaw = raw.children ?? raw.linked_students ?? raw.students ?? raw.student_links;
  if (!Array.isArray(legacyRaw) || legacyRaw.length === 0) return parent;

  const legacyChildren = legacyRaw
    .map(normalizeLegacyChild)
    .filter((c): c is ParentChild => c != null);

  return legacyChildren.length > 0 ? { ...parent, children: legacyChildren } : parent;
}

export function normalizeParentListItems(data: unknown): Parent[] {
  if (!Array.isArray(data)) return [];
  return data.map(normalizeParentListItem).filter((p): p is Parent => p != null);
}

/** @internal — test helper for relationship resolution rules. */
export function __testResolveActiveChildren(raw: Record<string, unknown>): ParentChild[] {
  return resolveActiveChildren(raw);
}

export {
  usesUnifiedParentContract,
  isActiveGuardianRelationship,
  hasRelationshipsContract,
} from './parent-relationships-normalize';
