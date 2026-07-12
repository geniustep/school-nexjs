import 'server-only';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { tenantBackendNotConfiguredResponse } from '@/lib/api/odoo-backend';
import { canonicalizeBffPathSegments } from '@/lib/api/safe-bff-path';
import { guardTenantFromServerHeaders } from '@/lib/auth/tenant-guard';
import { resolveTenantRuntimeConfigFromServerHeaders } from '@/lib/tenant';

export type AttachmentBinaryKind = 'download' | 'preview' | 'thumbnail';

const PRIVATE_NO_STORE = 'private, no-store, max-age=0';

export async function forwardAttachmentBinary(
  id: string,
  kind: AttachmentBinaryKind,
): Promise<NextResponse> {
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

  const idCheck = canonicalizeBffPathSegments([id]);
  if (!idCheck.ok || idCheck.segments.length !== 1) {
    return NextResponse.json(
      { success: false, error: { code: 'invalid_path', message: 'Invalid attachment id.' } },
      { status: 400 },
    );
  }

  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;
  const baseUrl = runtime.config.backendBaseUrl;

  const url = `${baseUrl}${config.apiPrefix}/attachments/${encodeURIComponent(idCheck.segments[0])}/${kind}`;

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
      { success: false, error: { code: 'not_found', message: 'Attachment not found.' } },
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
  if (contentType) headers.set('Content-Type', contentType);
  if (disposition) headers.set('Content-Disposition', disposition);
  // Private attachments: never inherit public/shared cache from upstream.
  headers.set('Cache-Control', PRIVATE_NO_STORE);
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');

  return new NextResponse(buffer, { status: 200, headers });
}
