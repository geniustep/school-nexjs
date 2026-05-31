// Binary attachment download BFF. Forwards session cookie to Odoo and streams
// the file back to the browser (JSON proxy cannot handle binary payloads).

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: { code: 'unauthenticated', message: 'No active session.' } },
      { status: 401 },
    );
  }

  const url = `${config.odooBaseUrl}${config.apiPrefix}/attachments/${encodeURIComponent(id)}/download`;

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
      { success: false, error: { code: 'server_error', message: `Unexpected response (${res.status}).` } },
      { status: res.status },
    );
  }

  const buffer = await res.arrayBuffer();
  const headers = new Headers();
  const contentType = res.headers.get('content-type');
  const disposition = res.headers.get('content-disposition');
  if (contentType) headers.set('Content-Type', contentType);
  if (disposition) headers.set('Content-Disposition', disposition);

  return new NextResponse(buffer, { status: 200, headers });
}
