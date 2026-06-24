import 'server-only';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { resolveOdooBaseUrlForTenant } from '@/lib/api/odoo-backend';
import { guardTenantFromServerHeaders } from '@/lib/auth/tenant-guard';

/** Allowed Odoo web subpaths for same-origin proxy (session-scoped). */
const ALLOWED_WEB_PREFIXES = ['image/'] as const;

function isAllowedOdooWebPath(path: string): boolean {
  return ALLOWED_WEB_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/** Forward GET /web/{path} to Odoo with the active session cookie. */
export async function forwardOdooWebBinary(pathSegments: string[]): Promise<NextResponse> {
  const tenantGuard = await guardTenantFromServerHeaders();
  if (!tenantGuard.ok) return tenantGuard.response;

  const path = pathSegments.map((segment) => decodeURIComponent(segment)).join('/');
  if (!path || !isAllowedOdooWebPath(path)) {
    return NextResponse.json(
      { success: false, error: { code: 'forbidden', message: 'Path not allowed.' } },
      { status: 403 },
    );
  }

  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;
  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: { code: 'unauthenticated', message: 'No active session.' } },
      { status: 401 },
    );
  }

  const tenant = store.get(config.tenantCookieName)?.value?.trim();
  const baseUrl = tenant ? resolveOdooBaseUrlForTenant(tenant) : config.odooBaseUrl;
  const url = `${baseUrl}/web/${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'network_error', message: 'Could not reach server.' } },
      { status: 502 },
    );
  }

  if (res.status === 403) {
    return NextResponse.json(
      { success: false, error: { code: 'permission_denied', message: 'Forbidden.' } },
      { status: 403 },
    );
  }

  if (res.status === 404) {
    return NextResponse.json(
      { success: false, error: { code: 'not_found', message: 'Resource not found.' } },
      { status: 404 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'server_error', message: `Unexpected response (${res.status}).` },
      },
      { status: res.status },
    );
  }

  const buffer = await res.arrayBuffer();
  const headers = new Headers();
  const contentType = res.headers.get('content-type');
  const disposition = res.headers.get('content-disposition');
  const cacheControl = res.headers.get('cache-control');
  if (contentType) headers.set('Content-Type', contentType);
  if (disposition) headers.set('Content-Disposition', disposition);
  headers.set('Cache-Control', cacheControl ?? 'private, no-store');

  return new NextResponse(buffer, { status: 200, headers });
}
