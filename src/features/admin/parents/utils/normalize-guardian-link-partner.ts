import type {
  ExistingPersonRole,
  GuardianLinkCandidate,
  GuardianLinkPartnerResponse,
} from '@/types/guardian-link';

const EXISTING_PERSON_ROLES = new Set<ExistingPersonRole>([
  'guardian',
  'teacher',
  'admin',
  'employee',
  'student',
  'user',
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readExistingRoles(value: unknown): ExistingPersonRole[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ExistingPersonRole =>
      typeof item === 'string' && EXISTING_PERSON_ROLES.has(item as ExistingPersonRole),
  );
}

export function normalizeGuardianLinkCandidate(data: unknown): GuardianLinkCandidate | null {
  const raw = asRecord(data);
  if (!raw || typeof raw.partner_id !== 'number') return null;

  const displayName =
    (typeof raw.display_name === 'string' && raw.display_name.trim()) ||
    (typeof raw.name === 'string' && raw.name.trim()) ||
    '';

  return {
    partner_id: raw.partner_id,
    display_name: displayName,
    phone: typeof raw.phone === 'string' ? raw.phone : null,
    mobile: typeof raw.mobile === 'string' ? raw.mobile : null,
    email: typeof raw.email === 'string' ? raw.email : null,
    existing_roles: readExistingRoles(raw.existing_roles),
    can_link_as_guardian: raw.can_link_as_guardian !== false,
    guardian_id: typeof raw.guardian_id === 'number' ? raw.guardian_id : null,
    teacher_id: typeof raw.teacher_id === 'number' ? raw.teacher_id : null,
    user_id: typeof raw.user_id === 'number' ? raw.user_id : null,
    reason: typeof raw.reason === 'string' ? raw.reason : null,
  };
}

export function normalizeGuardianLinkPartnerResponse(data: unknown): GuardianLinkPartnerResponse | null {
  const raw = asRecord(data);
  if (!raw) return null;

  const guardianRaw = asRecord(raw.guardian);
  const person = normalizeGuardianLinkCandidate(raw.person ?? raw);
  if (!guardianRaw || typeof guardianRaw.id !== 'number' || !person) return null;

  const name =
    (typeof guardianRaw.name === 'string' && guardianRaw.name.trim()) ||
    person.display_name ||
    '';

  const accountRaw = asRecord(raw.account);
  const account = accountRaw
    ? {
        user_id: typeof accountRaw.user_id === 'number' ? accountRaw.user_id : null,
        roles_added: Array.isArray(accountRaw.roles_added)
          ? accountRaw.roles_added.filter((r): r is string => typeof r === 'string')
          : undefined,
        roles_existing: Array.isArray(accountRaw.roles_existing)
          ? accountRaw.roles_existing.filter((r): r is string => typeof r === 'string')
          : undefined,
        active_role_changed: accountRaw.active_role_changed === true,
      }
    : null;

  return {
    guardian: {
      id: guardianRaw.id,
      partner_id:
        typeof guardianRaw.partner_id === 'number' ? guardianRaw.partner_id : person.partner_id,
      name,
      phone:
        (typeof guardianRaw.phone === 'string' ? guardianRaw.phone : null) ??
        person.phone ??
        person.mobile ??
        null,
      email:
        (typeof guardianRaw.email === 'string' ? guardianRaw.email : null) ?? person.email ?? null,
      active: guardianRaw.active !== false,
      preferred_language:
        typeof guardianRaw.preferred_language === 'string'
          ? guardianRaw.preferred_language
          : null,
      notification_opt_in:
        typeof guardianRaw.notification_opt_in === 'boolean'
          ? guardianRaw.notification_opt_in
          : null,
    },
    person,
    account,
  };
}

export function buildLinkPartnerPayload(input: {
  partnerId: number;
  preferredLanguage: string;
  notificationOptIn: boolean;
}) {
  return {
    partner_id: input.partnerId,
    preferred_language: input.preferredLanguage,
    notification_opt_in: input.notificationOptIn,
  };
}

export function resolveGuardianIdFromLinkResponse(
  response: GuardianLinkPartnerResponse | null,
): number | null {
  if (!response) return null;
  return response.guardian.id ?? response.person.guardian_id ?? null;
}
