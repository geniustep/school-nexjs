import 'server-only';

import { cookies } from 'next/headers';
import { config, cookieSecure } from '@/lib/config';
import {
  normalizeMeUser,
  resolveActiveSchoolId,
  resolveSchoolCatalog,
  resolveSchoolIds,
  schoolRefForId,
} from '@/lib/auth/normalize-user';
import { resolveEffectiveRole } from '@/lib/auth/active-role-workspace';
import type { CurrentUser } from '@/types/user';

const ACTIVE_SCHOOL_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function activeSchoolCookieOptions() {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: ACTIVE_SCHOOL_COOKIE_MAX_AGE,
  };
}

export async function getActiveSchoolCookie(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(config.activeSchoolCookieName)?.value;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Persist or clear the httpOnly active-school cookie. */
export async function setActiveSchoolCookieValue(schoolId: number | null): Promise<void> {
  const store = await cookies();
  if (schoolId == null) {
    store.delete(config.activeSchoolCookieName);
    return;
  }
  store.set(config.activeSchoolCookieName, String(schoolId), activeSchoolCookieOptions());
}

/** Align cookie with resolved active school when bindings change (stale cookie / /me drift). */
export async function syncActiveSchoolCookie(user: CurrentUser): Promise<number | null> {
  const normalized = normalizeMeUser(user);
  if (resolveEffectiveRole(normalized) !== 'admin') return null;
  const cookieId = await getActiveSchoolCookie();
  const contextId = normalized.active_context?.role === 'admin'
    ? normalized.active_context.school_id
    : null;
  const activeId = contextId ?? resolveActiveSchoolId(normalized, cookieId);
  if (cookieId !== activeId) {
    await setActiveSchoolCookieValue(activeId);
  }
  return activeId;
}

/** Resolve active school for layouts/guards (read-only; does not mutate cookies). */
export async function applyActiveSchoolToUser(user: CurrentUser): Promise<CurrentUser> {
  const normalized = normalizeMeUser(user);
  if (resolveEffectiveRole(normalized) !== 'admin') return normalized;
  const cookieId = await getActiveSchoolCookie();
  const contextId = normalized.active_context?.role === 'admin'
    ? normalized.active_context.school_id
    : null;
  const activeId = contextId ?? resolveActiveSchoolId(normalized, cookieId);
  const catalog = resolveSchoolCatalog(normalized);
  return {
    ...normalized,
    active_school_id: activeId ?? undefined,
    school: schoolRefForId(catalog, activeId),
  };
}

export function isActiveSchoolAllowed(user: CurrentUser, schoolId: number): boolean {
  return resolveSchoolIds(normalizeMeUser(user)).includes(schoolId);
}
