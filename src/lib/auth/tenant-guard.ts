// Tenant-session binding: prevents reusing a session cookie across school subdomains.

import 'server-only';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { config, cookieSecure } from '@/lib/config';
import {
  resolveTenantFromRequest,
  resolveTenantFromServerHeaders,
  tenantSessionMatches,
} from '@/lib/tenant';

const UNAUTH_BODY = {
  success: false as const,
  error: { code: 'unauthenticated', message: 'No active session.', details: {} },
  meta: {},
};

export function clearAuthCookies(response: NextResponse): void {
  const base = { httpOnly: true, path: '/', maxAge: 0 } as const;
  response.cookies.set(config.sessionCookieName, '', base);
  response.cookies.set(config.tenantCookieName, '', base);
  response.cookies.set(config.activeSchoolCookieName, '', base);
}

export function setTenantCookie(response: NextResponse, tenant: string): void {
  response.cookies.set(config.tenantCookieName, tenant, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

function mismatchResponse(): NextResponse {
  const response = NextResponse.json(UNAUTH_BODY, { status: 401 });
  clearAuthCookies(response);
  return response;
}

export type TenantGuardResult = { ok: true } | { ok: false; response: NextResponse };

/** Guard for route handlers that receive the incoming Request. */
export async function guardTenantFromRequest(request: Request): Promise<TenantGuardResult> {
  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;
  if (!sessionId) {
    return { ok: false, response: NextResponse.json(UNAUTH_BODY, { status: 401 }) };
  }

  const resolved = resolveTenantFromRequest(request);
  const storedTenant = store.get(config.tenantCookieName)?.value ?? null;

  if (!tenantSessionMatches(storedTenant, resolved)) {
    return { ok: false, response: mismatchResponse() };
  }

  return { ok: true };
}

/** Guard for server modules that only have access to next/headers (no Request). */
export async function guardTenantFromServerHeaders(): Promise<TenantGuardResult> {
  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;
  if (!sessionId) {
    return { ok: false, response: NextResponse.json(UNAUTH_BODY, { status: 401 }) };
  }

  const resolved = await resolveTenantFromServerHeaders();
  const storedTenant = store.get(config.tenantCookieName)?.value ?? null;

  if (!tenantSessionMatches(storedTenant, resolved)) {
    return { ok: false, response: mismatchResponse() };
  }

  return { ok: true };
}

/** Lightweight check for server components — returns false and skips Odoo when mismatched. */
export async function isTenantSessionValid(): Promise<boolean> {
  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;
  if (!sessionId) return false;

  const resolved = await resolveTenantFromServerHeaders();
  const storedTenant = store.get(config.tenantCookieName)?.value ?? null;
  return tenantSessionMatches(storedTenant, resolved);
}
