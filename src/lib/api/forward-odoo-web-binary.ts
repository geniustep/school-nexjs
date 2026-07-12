import 'server-only';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { tenantBackendNotConfiguredResponse } from '@/lib/api/odoo-backend';
import {
  assertUrlStaysUnderPathPrefix,
  canonicalizeBffPathSegments,
  unsafeBffPathErrorBody,
} from '@/lib/api/safe-bff-path';
import { guardTenantFromServerHeaders } from '@/lib/auth/tenant-guard';
import { resolveTenantRuntimeConfigFromServerHeaders } from '@/lib/tenant';

/** Allowed first segment for Odoo web binary proxy (exact match after canonicalization). */
const ODOO_WEB_IMAGE_ROOT = 'image';

function forbiddenPathResponse() {
  return NextResponse.json(unsafeBffPathErrorBody('forbidden'), { status: 403 });
}

function invalidPathResponse() {
  return NextResponse.json(unsafeBffPathErrorBody('invalid_path'), { status: 400 });
}

/** Forward GET /web/image/... to Odoo with the active session cookie. */
export async function forwardOdooWebBinary(pathSegments: string[]): Promise<NextResponse> {
  const tenantGuard = await guardTenantFromServerHeaders();
  if (!tenantGuard.ok) return tenantGuard.response;

  const runtime = await resolveTenantRuntimeConfigFromServerHeaders();
  if (!runtime.ok) {
    if (runtime.reason === 'tenant_backend_not_configured') {
      return tenantBackendNotConfiguredResponse();
    }
    return NextResponse.json(
      { success: false, error: { code: 'invalid_tenant', message: 'Invalid or unsupported host.' } },
      { status: 404 },
    );
  }

  const canonical = canonicalizeBffPathSegments(pathSegments);
  if (!canonical.ok) {
    return invalidPathResponse();
  }

  if (canonical.segments[0] !== ODOO_WEB_IMAGE_ROOT) {
    return forbiddenPathResponse();
  }

  // Deny technical namespaces anywhere under the image tree.
  const denied = new Set([
    'dataset',
    'call_kw',
    'jsonrpc',
    'xmlrpc',
    'session',
    'web',
  ]);
  if (canonical.segments.some((s) => denied.has(s.toLowerCase()))) {
    return forbiddenPathResponse();
  }

  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;
  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: { code: 'unauthenticated', message: 'No active session.' } },
      { status: 401 },
    );
  }

  const baseUrl = runtime.config.backendBaseUrl;
  // Build with encoded segments only — never join raw user input.
  const webRelative = canonical.segments.map((s) => encodeURIComponent(s)).join('/');
  const url = `${baseUrl.replace(/\/$/, '')}/web/${webRelative}`;

  const prefixCheck = assertUrlStaysUnderPathPrefix(url, baseUrl, '/web/image');
  if (!prefixCheck.ok) {
    return forbiddenPathResponse();
  }

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
