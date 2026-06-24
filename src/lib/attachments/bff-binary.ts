import 'server-only';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { resolveOdooBaseUrlForTenant } from '@/lib/api/odoo-backend';
import { guardTenantFromServerHeaders } from '@/lib/auth/tenant-guard';

export type AttachmentBinaryKind = 'download' | 'preview' | 'thumbnail';

export async function forwardAttachmentBinary(
  id: string,
  kind: AttachmentBinaryKind,
): Promise<NextResponse> {
  const tenantGuard = await guardTenantFromServerHeaders();
  if (!tenantGuard.ok) return tenantGuard.response;

  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;
  const tenant = store.get(config.tenantCookieName)?.value?.trim();
  const baseUrl = tenant ? resolveOdooBaseUrlForTenant(tenant) : config.odooBaseUrl;

  const url = `${baseUrl}${config.apiPrefix}/attachments/${encodeURIComponent(id)}/${kind}`;

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
  const cacheControl = res.headers.get('cache-control');
  if (contentType) headers.set('Content-Type', contentType);
  if (disposition) headers.set('Content-Disposition', disposition);
  if (cacheControl) headers.set('Cache-Control', cacheControl);

  return new NextResponse(buffer, { status: 200, headers });
}
