import type { GuardianAccountInfo, GuardianQuickCreateResponse, GuardianSummary } from '@/types/student-360';
import { getGuardianEmailPresentation } from './guardian-email-presentation';
import { readIdentityDocumentFields } from '@/features/admin/parents/utils/identity-document';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readEmail(raw: Record<string, unknown>): string | null {
  if (raw.email === false || raw.email == null) return null;
  if (typeof raw.email !== 'string') return null;
  const presentation = getGuardianEmailPresentation(raw.email);
  return presentation.kind === 'usable' ? presentation.email : null;
}

function readStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return list.length ? list : undefined;
}

function readGuardianAccount(raw: Record<string, unknown>): GuardianAccountInfo | null {
  const accountRaw = asRecord(raw.account);
  const login =
    (typeof accountRaw?.login === 'string' && accountRaw.login.trim()) ||
    (typeof raw.login === 'string' && raw.login.trim()) ||
    null;
  const status =
    (typeof accountRaw?.status === 'string' && accountRaw.status.trim()) ||
    (typeof raw.account_status === 'string' && raw.account_status.trim()) ||
    null;
  const has_user_account =
    accountRaw?.has_user_account === true
      ? true
      : accountRaw?.has_user_account === false
        ? false
        : raw.has_user_account === true
          ? true
          : raw.has_user_account === false
            ? false
            : undefined;
  const can_assign_password =
    typeof accountRaw?.can_assign_password === 'boolean'
      ? accountRaw.can_assign_password
      : typeof raw.can_assign_password === 'boolean'
        ? raw.can_assign_password
        : undefined;
  const password_was_set =
    typeof accountRaw?.password_was_set === 'boolean'
      ? accountRaw.password_was_set
      : typeof raw.password_was_set === 'boolean'
        ? raw.password_was_set
        : undefined;
  if (!login && !status && has_user_account == null && can_assign_password == null && password_was_set == null) {
    return null;
  }
  return {
    login,
    status,
    has_user_account,
    can_assign_password,
    password_was_set,
  };
}

/** Map School API guardian payload (flat or nested) to GuardianSummary. */
export function normalizeGuardianSummary(data: unknown): GuardianSummary | null {
  const raw = asRecord(data);
  if (!raw) return null;

  const guardianId =
    typeof raw.guardian_id === 'number'
      ? raw.guardian_id
      : typeof raw.id === 'number'
        ? raw.id
        : null;
  if (guardianId == null && typeof raw.partner_id !== 'number') return null;

  const id = guardianId ?? (typeof raw.partner_id === 'number' ? raw.partner_id : null);
  if (id == null) return null;

  const name =
    (typeof raw.display_name === 'string' && raw.display_name.trim()) ||
    (typeof raw.name === 'string' && raw.name.trim()) ||
    (typeof raw.full_name === 'string' && raw.full_name.trim()) ||
    '';

  const hasUserAccount =
    raw.has_user_account === true ||
    raw.has_account === true ||
    (typeof raw.user_id === 'number' && raw.user_id > 0) ||
    readGuardianAccount(raw)?.has_user_account === true;

  const guardianAccount = readGuardianAccount(raw);
  const legacyAccount = asRecord(raw.account);
  const account =
    guardianAccount ??
    (legacyAccount?.user_id
      ? {
          login:
            (typeof legacyAccount.login === 'string' && legacyAccount.login.trim()) || null,
          status:
            (typeof legacyAccount.status === 'string' && legacyAccount.status.trim()) || null,
          has_user_account: legacyAccount.has_user_account === true || hasUserAccount,
        }
      : null);

  const identity = readIdentityDocumentFields(raw);

  return {
    id,
    code: typeof raw.code === 'string' && raw.code.trim() ? raw.code.trim() : null,
    partner_id: typeof raw.partner_id === 'number' ? raw.partner_id : undefined,
    person_id: typeof raw.person_id === 'number' ? raw.person_id : undefined,
    guardian_id: typeof raw.guardian_id === 'number' ? raw.guardian_id : guardianId,
    teacher_id: typeof raw.teacher_id === 'number' ? raw.teacher_id : null,
    staff_id: typeof raw.staff_id === 'number' ? raw.staff_id : null,
    user_id: typeof raw.user_id === 'number' ? raw.user_id : null,
    guardian_links_count:
      typeof raw.guardian_links_count === 'number' ? raw.guardian_links_count : undefined,
    linked_students_count:
      typeof raw.linked_students_count === 'number' ? raw.linked_students_count : undefined,
    name,
    phone:
      (typeof raw.phone === 'string' ? raw.phone : null) ??
      (typeof raw.mobile === 'string' ? raw.mobile : null),
    secondary_phone: typeof raw.secondary_phone === 'string' ? raw.secondary_phone : null,
    email: readEmail(raw),
    address: typeof raw.address === 'string' ? raw.address : null,
    children_count:
      typeof raw.children_count === 'number'
        ? raw.children_count
        : typeof raw.linked_students_count === 'number'
          ? raw.linked_students_count
          : undefined,
    national_id: identity.national_id,
    identity_document_type: identity.identity_document_type,
    identity_document_number: identity.identity_document_number,
    identity_document_country: identity.identity_document_country,
    national_id_masked: identity.national_id_masked,
    identity_document_number_masked: identity.identity_document_number_masked,
    existing_roles: readStringList(raw.existing_roles),
    role_labels: readStringList(raw.role_labels),
    has_user: raw.has_user === true || hasUserAccount,
    has_user_account: hasUserAccount,
    has_account: hasUserAccount,
    account,
  };
}

/** GET list endpoints may return `{ items: GuardianSummary[] }`. */
export function normalizeGuardianList(data: unknown): GuardianSummary[] {
  if (Array.isArray(data)) {
    return data.map(normalizeGuardianSummary).filter((g): g is GuardianSummary => g != null);
  }
  const raw = asRecord(data);
  if (Array.isArray(raw?.items)) {
    return raw.items.map(normalizeGuardianSummary).filter((g): g is GuardianSummary => g != null);
  }
  return [];
}

/** POST /admin/guardians/quick-create — nested `{ guardian }` or flat guardian object. */
export function normalizeGuardianQuickCreateResponse(data: unknown): GuardianSummary | null {
  const raw = asRecord(data);
  if (!raw) return null;

  if (raw.guardian != null) {
    return normalizeGuardianSummary(raw.guardian);
  }

  return normalizeGuardianSummary(raw);
}

export function isGuardianQuickCreateResponse(data: unknown): data is GuardianQuickCreateResponse {
  return normalizeGuardianQuickCreateResponse(data) != null;
}
