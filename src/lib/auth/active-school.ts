import 'server-only';

import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import {
  normalizeMeUser,
  resolveActiveSchoolId,
  resolveSchoolIds,
  schoolRefForId,
  resolveSchoolCatalog,
} from '@/lib/auth/normalize-user';
import type { CurrentUser } from '@/types/user';

export async function getActiveSchoolCookie(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(config.activeSchoolCookieName)?.value;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function applyActiveSchoolToUser(user: CurrentUser): Promise<CurrentUser> {
  if (user.role !== 'admin') return user;
  const normalized = normalizeMeUser(user);
  const cookieId = await getActiveSchoolCookie();
  const activeId = resolveActiveSchoolId(normalized, cookieId);
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
