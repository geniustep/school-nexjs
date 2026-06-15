import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { LinkPersonAsGuardianPayload, LinkPersonAsGuardianResponse } from '@/types/student-360';
import { normalizeGuardianSummary } from './normalize-guardian';

export async function linkExistingPersonAsGuardian(
  studentId: number,
  payload: LinkPersonAsGuardianPayload,
) {
  return api.post<LinkPersonAsGuardianResponse>(
    endpoints.admin.studentGuardiansLinkPerson(studentId),
    payload,
  );
}

export function normalizeLinkPersonResponse(data: unknown): LinkPersonAsGuardianResponse | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const guardian = normalizeGuardianSummary(raw.guardian ?? raw);
  if (!guardian) return null;

  const accountRaw =
    raw.account && typeof raw.account === 'object' ? (raw.account as Record<string, unknown>) : null;
  const personRaw =
    raw.person && typeof raw.person === 'object' ? (raw.person as Record<string, unknown>) : null;

  const account = accountRaw
    ? {
        has_user_account: accountRaw.has_user_account === true,
        user_id: typeof accountRaw.user_id === 'number' ? accountRaw.user_id : undefined,
        needs_new_account:
          typeof accountRaw.needs_new_account === 'boolean' ? accountRaw.needs_new_account : undefined,
        can_assign_password:
          typeof accountRaw.can_assign_password === 'boolean'
            ? accountRaw.can_assign_password
            : undefined,
        roles_added: Array.isArray(accountRaw.roles_added)
          ? accountRaw.roles_added.filter((r): r is string => typeof r === 'string')
          : undefined,
      }
    : undefined;

  const person = personRaw
    ? {
        existing_roles: Array.isArray(personRaw.existing_roles)
          ? personRaw.existing_roles.filter((r): r is string => typeof r === 'string')
          : undefined,
        role_labels: Array.isArray(personRaw.role_labels)
          ? personRaw.role_labels.filter((r): r is string => typeof r === 'string')
          : undefined,
      }
    : undefined;

  const mergedGuardian = {
    ...guardian,
    existing_roles: person?.existing_roles ?? guardian.existing_roles,
    role_labels: person?.role_labels ?? guardian.role_labels,
    has_user_account: account?.has_user_account ?? guardian.has_user_account ?? guardian.has_account,
    has_account: account?.has_user_account ?? guardian.has_account,
  };

  return { guardian: mergedGuardian, account, person };
}
