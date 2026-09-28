import 'server-only';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { odooApiFetch } from '@/lib/api/odoo-server';
import { getActiveRoleCookie } from '@/lib/auth/active-role-preference';
import { requireEdgeAdminBffContext } from '@/features/admin/edge/api/bff';

const PRIVATE_NO_STORE = 'private, no-store, max-age=0';

async function transportContext() {
  const permission = await requireEdgeAdminBffContext();
  if (!permission.ok) return permission;

  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;
  const activeRole = (await getActiveRoleCookie()) ?? undefined;
  return {
    ok: true as const,
    sessionId,
    activeRole,
    activeSchoolId: permission.user.active_school_id,
  };
}

export async function forwardEdgeAudioMultipart(
  request: Request,
  upstreamPath: string,
): Promise<NextResponse> {
  const context = await transportContext();
  if (!context.ok) return context.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'validation_error',
          message: 'Invalid multipart form data.',
          details: {},
        },
        meta: {},
      },
      { status: 422 },
    );
  }

  const result = await odooApiFetch<unknown>(upstreamPath, {
    method: 'POST',
    sessionId: context.sessionId,
    activeRole: context.activeRole,
    formData,
    query: { active_school_id: context.activeSchoolId ?? undefined },
  });

  if (result.kind === 'file') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'server_error',
          message: 'Unexpected file response.',
          details: {},
        },
        meta: {},
      },
      { status: 502 },
    );
  }

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { 'Cache-Control': PRIVATE_NO_STORE },
  });
}

export async function forwardEdgeAudioBinary(
  upstreamPath: string,
): Promise<NextResponse> {
  const context = await transportContext();
  if (!context.ok) return context.response;

  const result = await odooApiFetch<unknown>(upstreamPath, {
    method: 'GET',
    sessionId: context.sessionId,
    activeRole: context.activeRole,
    query: { active_school_id: context.activeSchoolId ?? undefined },
  });

  if (result.kind === 'json') {
    return NextResponse.json(result.body, {
      status: result.status,
      headers: { 'Cache-Control': PRIVATE_NO_STORE },
    });
  }

  const headers = new Headers();
  if (result.headers.contentType) {
    headers.set('Content-Type', result.headers.contentType);
  }
  if (result.headers.contentDisposition) {
    headers.set('Content-Disposition', result.headers.contentDisposition);
  }
  headers.set('Cache-Control', PRIVATE_NO_STORE);
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  headers.set('X-Content-Type-Options', 'nosniff');

  return new NextResponse(result.data, {
    status: result.status,
    headers,
  });
}
