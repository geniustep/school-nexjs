// Server-side route guards. Used by role layouts to enforce authentication and
// role boundaries before rendering. Server enforcement is the source of truth;
// these guards prevent the wrong portal from rendering at all.

import 'server-only';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/server';
import { resolveEffectiveRole } from '@/lib/auth/active-role-workspace';
import { homeForUser } from '@/lib/routes/role-routes';
import type { CurrentUser, Role } from '@/types/user';

/** Require any authenticated user. Redirects to /login otherwise. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * Require a specific portal role matching the Odoo-confirmed active role.
 * Wrong portal → redirect to the user's own workspace home.
 */
export async function requireRole(role: Role): Promise<CurrentUser> {
  const user = await requireUser();
  if (resolveEffectiveRole(user) !== role) {
    redirect(homeForUser(user));
  }
  return user;
}
