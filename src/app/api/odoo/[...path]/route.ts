// Generic BFF proxy. Every browser-side data call goes through here:
//
//   GET /api/odoo/admin/students  ->  GET {ODOO}/api/v1/admin/students
//
// The route injects the httpOnly Odoo session cookie, forwards query + body,
// and returns Odoo's response envelope untouched. This keeps the session
// server-side and gives the client a single same-origin base URL.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { buildBffProxyPath } from '@/lib/api/build-odoo-api-url';
import { getStoredTenantSlug } from '@/lib/api/odoo-backend';
import { odooApiFetch } from '@/lib/api/odoo-server';
import { getCurrentUser } from '@/lib/api/server';
import { getActiveSchoolCookie, setActiveSchoolCookieValue } from '@/lib/auth/active-school';
import { guardTenantFromRequest } from '@/lib/auth/tenant-guard';
import { isOdooAdminRoleTeacherEndpointBlock } from '@/lib/auth/teacher-workspace-api';
import { shouldUseTeacherWorkspace } from '@/lib/auth/teacher-workspace';

export const dynamic = 'force-dynamic';

async function handle(request: NextRequest, segments: string[]) {
  const tenantGuard = await guardTenantFromRequest(request);
  if (!tenantGuard.ok) return tenantGuard.response;

  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;
  const tenant = await getStoredTenantSlug();

  const path = buildBffProxyPath(segments);
  const query: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  if (path.startsWith('/admin/')) {
    const user = await getCurrentUser();
    const activeId = user?.active_school_id;
    if (activeId) {
      query.active_school_id = String(activeId);
      const cookieId = await getActiveSchoolCookie();
      if (cookieId !== activeId) {
        await setActiveSchoolCookieValue(activeId);
      }
    }
  }

  let body: unknown;
  let formData: FormData | undefined;
  const method = request.method.toUpperCase();
  const contentType = request.headers.get('content-type') ?? '';
  if (method !== 'GET' && method !== 'HEAD') {
    if (contentType.includes('multipart/form-data')) {
      formData = await request.formData();
    } else {
      try {
        body = await request.json();
      } catch {
        body = undefined;
      }
    }
  }

  const result = await odooApiFetch(path, {
    method,
    sessionId,
    tenant: tenant ?? undefined,
    query,
    body,
    formData,
  });

  if (result.kind === 'file') {
    const headers = new Headers();
    if (result.headers.contentType) headers.set('Content-Type', result.headers.contentType);
    if (result.headers.contentDisposition) {
      headers.set('Content-Disposition', result.headers.contentDisposition);
    }
    headers.set(
      'Cache-Control',
      result.headers.cacheControl ?? 'private, no-store',
    );
    return new NextResponse(result.data, { status: result.status, headers });
  }

  if (result.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  if (
    result.kind === 'json' &&
    path.startsWith('/teacher/') &&
    result.status === 403 &&
    method === 'GET'
  ) {
    const user = await getCurrentUser();
    const odooMessage =
      !result.body.success && result.body.error?.message ? result.body.error.message : '';
    if (
      user &&
      shouldUseTeacherWorkspace(user) &&
      isOdooAdminRoleTeacherEndpointBlock(odooMessage)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'teacher_workspace_unavailable',
            message: odooMessage,
            details: { odoo_status: 403, reason: 'admin_role_on_teacher_endpoint' },
          },
          meta: {},
        },
        { status: 403 },
      );
    }
  }

  return NextResponse.json(result.body, { status: result.status });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return handle(request, path);
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return handle(request, path);
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return handle(request, path);
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return handle(request, path);
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return handle(request, path);
}
