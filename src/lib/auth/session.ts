// Central session layer (server side). Thin, well-named surface over the
// server API client so the rest of the app imports session concepts, not raw
// fetch logic.

import 'server-only';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { getCurrentUser } from '@/lib/api/server';
import type { CurrentUser } from '@/types/user';

export { getCurrentUser };

/** True if a session cookie is present (does not validate it server-side). */
export async function hasSessionCookie(): Promise<boolean> {
  const store = await cookies();
  return !!store.get(config.sessionCookieName)?.value;
}

/** Resolve the session, returning the user or null. */
export async function getSession(): Promise<CurrentUser | null> {
  return getCurrentUser();
}
