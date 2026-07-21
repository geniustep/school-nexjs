/**
 * httpOnly preference for the Next.js active role (SSR-readable).
 * Odoo remains the authority; the cookie only remembers the last confirmed choice.
 */

import 'server-only';

import { cookies } from 'next/headers';
import { config, cookieSecure } from '@/lib/config';
import {
  LEGAL_ACTIVE_ROLES,
  type LegalActiveRole,
} from '@/lib/auth/active-role-transport';

const ACTIVE_ROLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const LEGAL_SET = new Set<string>(LEGAL_ACTIVE_ROLES);

export function activeRoleCookieOptions() {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: ACTIVE_ROLE_COOKIE_MAX_AGE,
  };
}

export function parseActiveRoleCookieValue(
  raw: string | null | undefined,
): LegalActiveRole | null {
  if (raw == null) return null;
  const value = raw.trim().toLowerCase();
  if (!value || !LEGAL_SET.has(value)) return null;
  return value as LegalActiveRole;
}

export async function getActiveRoleCookie(): Promise<LegalActiveRole | null> {
  const store = await cookies();
  return parseActiveRoleCookieValue(store.get(config.activeRoleCookieName)?.value);
}

export async function setActiveRoleCookieValue(
  role: LegalActiveRole | null,
): Promise<void> {
  const store = await cookies();
  if (role == null) {
    store.delete(config.activeRoleCookieName);
    return;
  }
  store.set(config.activeRoleCookieName, role, activeRoleCookieOptions());
}
