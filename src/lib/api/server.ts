// Server-side API client. Used by server components, layouts and guards to
// talk to Odoo directly (reading the httpOnly session cookie) without a
// round-trip back through the proxy route.

import 'server-only';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { odooApiFetch } from './odoo-server';
import { endpoints } from './endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type { MeResponse, CurrentUser } from '@/types/user';

async function sessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(config.sessionCookieName)?.value ?? null;
}

/** Low-level server GET returning the full envelope. */
export async function serverGet<T>(
  path: string,
  query?: ListParams,
): Promise<ApiResponse<T>> {
  const sid = await sessionId();
  const result = await odooApiFetch<T>(path, {
    method: 'GET',
    sessionId: sid,
    query: query as Record<string, string | number | undefined>,
  });
  if (result.kind === 'file') {
    return {
      success: false,
      error: { code: 'server_error', message: 'Unexpected file response.', details: {} },
      meta: {},
    };
  }
  return result.body;
}

/** Low-level server POST returning the full envelope. */
export async function serverPost<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  const sid = await sessionId();
  const result = await odooApiFetch<T>(path, {
    method: 'POST',
    sessionId: sid,
    body,
  });
  if (result.kind === 'file') {
    return {
      success: false,
      error: { code: 'server_error', message: 'Unexpected file response.', details: {} },
      meta: {},
    };
  }
  return result.body;
}

/**
 * Resolve the authenticated user, or null if there is no valid session.
 * This is the canonical server-side session check used by guards/layouts.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const sid = await sessionId();
  if (!sid) return null;
  const res = await serverGet<MeResponse>(endpoints.auth.me);
  if (!res.success) return null;
  return res.data.user;
}
