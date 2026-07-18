// Server-side API client. Used by server components, layouts and guards to
// talk to Odoo directly (reading the httpOnly session cookie) without a
// round-trip back through the proxy route.

import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { odooApiFetch } from './odoo-server';
import { endpoints } from './endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type { MeResponse, CurrentUser } from '@/types/user';
import { normalizeMeUser } from '@/lib/auth/normalize-user';
import { applyActiveSchoolToUser } from '@/lib/auth/active-school';
import { isTenantSessionValid } from '@/lib/auth/tenant-guard';
import {
  activeRoleCacheKey,
  type LegalActiveRole,
} from '@/lib/auth/active-role-transport';

async function sessionId(): Promise<string | null> {
  const store = await cookies();
  const sid = store.get(config.sessionCookieName)?.value ?? null;
  if (!sid) return null;
  if (!(await isTenantSessionValid())) return null;
  return sid;
}

async function fetchMeUser(activeRole?: LegalActiveRole): Promise<CurrentUser | null> {
  const sid = await sessionId();
  if (!sid) return null;
  const result = await odooApiFetch<MeResponse>(endpoints.auth.me, {
    method: 'GET',
    sessionId: sid,
    activeRole,
  });
  if (result.kind !== 'json' || !result.body.success) return null;
  return result.body.data.user;
}

async function mergeAdminQuery(
  path: string,
  query?: ListParams,
): Promise<Record<string, string | number | undefined> | undefined> {
  const base = query as Record<string, string | number | undefined> | undefined;
  if (!path.startsWith('/admin/')) return base;
  const user = await getCurrentUser();
  const activeSchool = user?.active_school_id;
  if (!activeSchool) return base;
  return { ...base, active_school_id: activeSchool };
}

/** Low-level server GET returning the full envelope. */
export async function serverGet<T>(
  path: string,
  query?: ListParams,
): Promise<ApiResponse<T>> {
  const sid = await sessionId();
  const mergedQuery = await mergeAdminQuery(path, query);
  const result = await odooApiFetch<T>(path, {
    method: 'GET',
    sessionId: sid,
    query: mergedQuery,
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

/** Low-level server PUT returning the full envelope. */
export async function serverPut<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  const sid = await sessionId();
  const mergedQuery = await mergeAdminQuery(path, undefined);
  const result = await odooApiFetch<T>(path, {
    method: 'PUT',
    sessionId: sid,
    query: mergedQuery,
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

/** Low-level server POST returning the full envelope. */
export async function serverPost<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  const sid = await sessionId();
  let mergedBody = body;
  if (path.startsWith('/admin/') && body && typeof body === 'object' && !Array.isArray(body)) {
    const user = await getCurrentUser();
    const activeSchool = user?.active_school_id;
    if (activeSchool) {
      mergedBody = { ...body, active_school_id: activeSchool };
    }
  }
  const result = await odooApiFetch<T>(path, {
    method: 'POST',
    sessionId: sid,
    body: mergedBody,
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
 * `activeRole` is part of the React cache key so admin/teacher/undefined do not share entries.
 * Callers that have request context (Flutter BFF) must pass the resolved role explicitly.
 */
export const getCurrentUser = cache(
  async (activeRole?: LegalActiveRole): Promise<CurrentUser | null> => {
    // `activeRole` is part of React cache's argument key (admin ≠ teacher ≠ undefined).
    void activeRoleCacheKey(activeRole);
    const raw = await fetchMeUser(activeRole);
    if (!raw) return null;
    return applyActiveSchoolToUser(normalizeMeUser(raw));
  },
);
