/**
 * Browser-side confirmed active role for X-SSC-Active-Role on BFF calls.
 * Set from SessionProvider after server confirmation — never invent unverified roles.
 */

import {
  ACTIVE_ROLE_HEADER,
  LEGAL_ACTIVE_ROLES,
  type LegalActiveRole,
} from '@/lib/auth/active-role-transport';

const LEGAL_SET = new Set<string>(LEGAL_ACTIVE_ROLES);

let confirmedActiveRole: LegalActiveRole | null = null;

export function setClientActiveRole(role: string | null | undefined): void {
  if (role == null) {
    confirmedActiveRole = null;
    return;
  }
  const normalized = role.trim().toLowerCase();
  if (!LEGAL_SET.has(normalized)) {
    confirmedActiveRole = null;
    return;
  }
  confirmedActiveRole = normalized as LegalActiveRole;
}

export function getClientActiveRole(): LegalActiveRole | null {
  return confirmedActiveRole;
}

/** Headers for browser → BFF. Omits the header when no confirmed role. */
export function clientActiveRoleHeaders(): Record<string, string> {
  const role = confirmedActiveRole;
  if (!role) return {};
  return { [ACTIVE_ROLE_HEADER]: role };
}
