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
        teacher_id: typeof personRaw.teacher_id === 'number' ? personRaw.teacher_id : null,
        staff_id: typeof personRaw.staff_id === 'number' ? personRaw.staff_id : null,
        guardian_id: typeof personRaw.guardian_id === 'number' ? personRaw.guardian_id : null,
        has_user: personRaw.has_user === true,
        has_user_account: personRaw.has_user_account === true,
        user_id: typeof personRaw.user_id === 'number' ? personRaw.user_id : null,
      }
    : undefined;

  const hasUserAccount =
    account?.has_user_account === true ||
    person?.has_user_account === true ||
    person?.has_user === true ||
    guardian.has_user_account === true ||
    guardian.has_account === true;

  const mergedGuardian = {
    ...guardian,
    existing_roles: person?.existing_roles ?? guardian.existing_roles,
    role_labels: person?.role_labels ?? guardian.role_labels,
    teacher_id: person?.teacher_id ?? guardian.teacher_id,
    staff_id: person?.staff_id ?? guardian.staff_id,
    guardian_id: person?.guardian_id ?? guardian.guardian_id,
    user_id: person?.user_id ?? guardian.user_id,
    has_user: person?.has_user ?? guardian.has_user ?? hasUserAccount,
    has_user_account: hasUserAccount,
    has_account: hasUserAccount,
  };

  return { guardian: mergedGuardian, account, person };
}
