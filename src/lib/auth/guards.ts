// Server-side route guards. Used by role layouts to enforce authentication and
// role boundaries before rendering. Server enforcement is the source of truth;
// these guards prevent the wrong portal from rendering at all.

import 'server-only';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/server';
import { homeForRole } from '@/lib/routes/role-routes';
import type { CurrentUser, Role } from '@/types/user';

/** Require any authenticated user. Redirects to /login otherwise. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * Require a specific role. If authenticated but wrong role, send the user to
 * their own portal home rather than leaking another portal.
 */
export async function requireRole(role: Role): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== role) redirect(homeForRole(user.role));
  return user;
}
