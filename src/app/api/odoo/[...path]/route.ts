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
import {
  assertOdooApiUrlUnderV1Prefix,
  buildOdooApiUrl,
  tryBuildBffProxyPath,
} from '@/lib/api/build-odoo-api-url';
import {
  assertBffRoutePolicy,
  shouldBindActiveSchoolInBody,
  shouldInjectActiveSchoolIdInBody,
} from '@/lib/api/bff-route-policy';
import {
  activeSchoolBodyMismatchResponse,
  bindActiveSchoolJsonBody,
} from '@/lib/api/bind-active-school-body';
import {
  assertMutationOrigin,
  mutationOriginForbiddenBody,
} from '@/lib/api/mutation-origin';
import { getStoredTenantSlug, tenantBackendNotConfiguredResponse } from '@/lib/api/odoo-backend';
import { odooApiFetch } from '@/lib/api/odoo-server';
import { unsafeBffPathErrorBody } from '@/lib/api/safe-bff-path';
import { getCurrentUser } from '@/lib/api/server';
import {
  activeRoleErrorBody,
  resolveActiveRoleFromRequest,
  type LegalActiveRole,
} from '@/lib/auth/active-role-transport';
import { getActiveRoleCookie } from '@/lib/auth/active-role-preference';
import { getActiveSchoolCookie, setActiveSchoolCookieValue } from '@/lib/auth/active-school';
import { guardTenantFromRequest } from '@/lib/auth/tenant-guard';
import { isOdooAdminRoleTeacherEndpointBlock } from '@/lib/auth/teacher-workspace-api';
import { shouldUseTeacherWorkspace } from '@/lib/auth/teacher-workspace';
import { getHostFromHeaders, resolveTenantRuntimeConfigFromRequest } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

function pathPolicyResponse(reason: string) {
  const status = reason === 'method_not_allowed' ? 405 : 404;
  const code = reason === 'method_not_allowed' ? 'method_not_allowed' : 'invalid_path';
  return NextResponse.json(unsafeBffPathErrorBody(code), { status });
}

async function handle(request: NextRequest, segments: string[]) {
  const runtime = resolveTenantRuntimeConfigFromRequest(request);
  if (!runtime.ok) {
    if (runtime.reason === 'tenant_backend_not_configured') {
      return tenantBackendNotConfiguredResponse();
    }
    const status =
      runtime.reason === 'missing_host' || runtime.reason === 'missing_fallback_db' ? 400 : 404;
    return NextResponse.json(
      {
        success: false,
        error: { code: 'invalid_tenant', message: 'Invalid or unsupported host.', details: {} },
        meta: {},
      },
      { status },
    );
  }

  const tenantGuard = await guardTenantFromRequest(request);
  if (!tenantGuard.ok) return tenantGuard.response;

  const pathResult = tryBuildBffProxyPath(segments);
  if (!pathResult.ok) {
    return NextResponse.json(unsafeBffPathErrorBody('invalid_path'), { status: 400 });
  }
  const path = pathResult.path;

  const method = request.method.toUpperCase();
  const policy = assertBffRoutePolicy(path, method);
  if (!policy.ok) {
    return pathPolicyResponse(policy.reason);
  }

  const originCheck = assertMutationOrigin(request, method);
  if (!originCheck.ok) {
    return NextResponse.json(mutationOriginForbiddenBody(), { status: 403 });
  }

  // Defense: ensure the would-be upstream URL cannot escape /api/v1.
  const previewUrl = buildOdooApiUrl(
    runtime.config.backendBaseUrl,
    config.apiPrefix,
    path,
  );
  const prefixOk = assertOdooApiUrlUnderV1Prefix(
    previewUrl,
    runtime.config.backendBaseUrl,
    config.apiPrefix,
  );
  if (!prefixOk.ok) {
    return NextResponse.json(unsafeBffPathErrorBody('invalid_path'), { status: 400 });
  }

  const roleResolved = resolveActiveRoleFromRequest(request);
  if (!roleResolved.ok) {
    return NextResponse.json(activeRoleErrorBody(roleResolved.code, roleResolved.message), {
      status: 400,
    });
  }
  const activeRole: LegalActiveRole | undefined =
    roleResolved.role ?? (await getActiveRoleCookie()) ?? undefined;

  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;
  const tenant = await getStoredTenantSlug();
  const host = getHostFromHeaders(request.headers);

  const query: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    // Canonical signal to Odoo is X-SSC-Active-Role via odooApiFetch options.
    // Drop query active_role so we never send two potentially divergent signals.
    if (key === 'active_role') return;
    query[key] = value;
  });

  let activeSchoolId: number | null | undefined;
  if (path.startsWith('/admin/') || shouldBindActiveSchoolInBody(path, method)) {
    const user = await getCurrentUser(activeRole);
    activeSchoolId = user?.active_school_id;
    if (path.startsWith('/admin/') && activeSchoolId) {
      query.active_school_id = String(activeSchoolId);
      const cookieId = await getActiveSchoolCookie();
      if (cookieId !== activeSchoolId) {
        await setActiveSchoolCookieValue(activeSchoolId);
      }
    }
  }

  let body: unknown;
  let formData: FormData | undefined;
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

      if (shouldBindActiveSchoolInBody(path, method) && !formData) {
        const bound = bindActiveSchoolJsonBody(body, activeSchoolId, {
          injectActiveSchoolId: shouldInjectActiveSchoolIdInBody(path),
        });
        if (!bound.ok) {
          return NextResponse.json(activeSchoolBodyMismatchResponse(bound.reason), {
            status: 422,
          });
        }
        body = bound.body;
      }
    }
  }

  const result = await odooApiFetch(path, {
    method,
    sessionId,
    tenant: tenant ?? undefined,
    backendBaseUrl: runtime.config.backendBaseUrl,
    host,
    query,
    body,
    formData,
    activeRole,
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
    const user = await getCurrentUser(activeRole);
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
