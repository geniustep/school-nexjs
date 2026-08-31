import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { buildOdooApiUrl } from '@/lib/api/build-odoo-api-url';
import { tenantBackendNotConfiguredResponse } from '@/lib/api/odoo-backend';
import { odooApiFetch } from '@/lib/api/odoo-server';
import {
  assertMutationOrigin,
  mutationOriginForbiddenBody,
} from '@/lib/api/mutation-origin';
import { config, cookieSecure } from '@/lib/config';
import {
  activeRoleCookieOptions,
} from '@/lib/auth/active-role-preference';
import {
  isLegalActiveRole,
  isMultiRoleUser,
  normalizeRoleCode,
} from '@/lib/auth/active-role-workspace';
import {
  activeSchoolCookieOptions,
  getActiveSchoolCookie,
} from '@/lib/auth/active-school';
import { normalizeMeUser, resolveActiveSchoolId } from '@/lib/auth/normalize-user';
import {
  extractOdooSessionId,
  parseRestoreCredentialBody,
  resolveRestoreCredentialRoute,
  restoreCredentialError,
  restoreCredentialOdooPath,
  restoreCredentialRouteRequiresSession,
} from '@/lib/auth/restore-credentials-bff';
import { guardTenantFromRequest, setTenantCookie } from '@/lib/auth/tenant-guard';
import { resolveTenantFromRequest, resolveTenantRuntimeConfigFromRequest } from '@/lib/tenant';
import type { ApiResponse } from '@/types/api';
import type { CurrentUser } from '@/types/user';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path: string[] }> };
type RestoreAuthData = { user: CurrentUser };

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isRestoreAuthSuccess(value: unknown): value is ApiResponse<RestoreAuthData> & { success: true } {
  if (!isRecord(value) || value.success !== true || !isRecord(value.data)) return false;
  return isRecord(value.data.user);
}

async function parseUpstreamJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return restoreCredentialError('upstream_error', 'Unexpected server response.');
  }
}

async function proxyAuthenticatedRestoreRequest(
  request: Request,
  route: NonNullable<ReturnType<typeof resolveRestoreCredentialRoute>>,
  body: Record<string, unknown>,
  tenant: string,
  backendBaseUrl: string,
) {
  const tenantGuard = await guardTenantFromRequest(request);
  if (!tenantGuard.ok) return tenantGuard.response;

  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;
  if (!sessionId) {
    return json(restoreCredentialError('unauthorized', 'Authentication required.'), 401);
  }

  const result = await odooApiFetch(restoreCredentialOdooPath(route), {
    method: 'POST',
    sessionId,
    tenant,
    backendBaseUrl,
    body,
  });

  if (result.kind !== 'json') {
    return json(restoreCredentialError('server_error', 'Unexpected server response.'), 502);
  }
  return json(result.body, result.status);
}

async function callRestorePreAuth(
  route: 'authentication/options' | 'authentication/verify',
  body: Record<string, unknown>,
  tenant: string,
  backendBaseUrl: string,
): Promise<{ response: Response | null; body: unknown }> {
  try {
    // Dedicated pre-auth handshake. The tenant comes only from the trusted host,
    // never from the request body. These are the only Restore Credential calls
    // that intentionally run without an existing BFF/Odoo session.
    const response = await fetch(
      buildOdooApiUrl(
        backendBaseUrl,
        config.apiPrefix,
        restoreCredentialOdooPath(route),
        { db: tenant },
      ),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      },
    );
    return { response, body: await parseUpstreamJson(response) };
  } catch {
    return {
      response: null,
      body: restoreCredentialError('network_error', 'Could not reach the server.'),
    };
  }
}

async function authenticationVerifyResponse(
  upstream: Response,
  upstreamBody: unknown,
  tenant: string,
) {
  if (!upstream.ok || !isRestoreAuthSuccess(upstreamBody)) {
    return json(upstreamBody, upstream.status);
  }

  const sessionId = extractOdooSessionId(upstream.headers.get('set-cookie'));
  if (!sessionId) {
    return json(
      restoreCredentialError('server_error', 'Authentication session was not established.'),
      502,
    );
  }

  const rawUser = upstreamBody.data.user;
  const normalized = normalizeMeUser(rawUser);
  const cookieSchoolId = await getActiveSchoolCookie();
  const activeId =
    normalized.role === 'admin'
      ? resolveActiveSchoolId(normalized, cookieSchoolId)
      : null;

  const response = json(
    {
      ...upstreamBody,
      data: {
        ...upstreamBody.data,
        user: {
          ...normalized,
          active_school_id: activeId ?? undefined,
        },
      },
    },
    200,
  );

  response.cookies.set(config.sessionCookieName, sessionId, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  setTenantCookie(response, tenant);

  if (normalized.role === 'admin') {
    if (activeId != null) {
      response.cookies.set(
        config.activeSchoolCookieName,
        String(activeId),
        activeSchoolCookieOptions(),
      );
    } else {
      response.cookies.set(config.activeSchoolCookieName, '', {
        httpOnly: true,
        path: '/',
        maxAge: 0,
      });
    }
  }

  const loginActiveRole = normalizeRoleCode(normalized.active_role ?? normalized.role);
  if (isMultiRoleUser(normalized) && loginActiveRole && isLegalActiveRole(loginActiveRole)) {
    response.cookies.set(
      config.activeRoleCookieName,
      loginActiveRole,
      activeRoleCookieOptions(),
    );
  } else {
    response.cookies.set(config.activeRoleCookieName, '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });
  }

  return response;
}

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const route = resolveRestoreCredentialRoute(path);
  if (!route) {
    return json(restoreCredentialError('not_found', 'Not found.'), 404);
  }

  const originCheck = assertMutationOrigin(request, 'POST');
  if (!originCheck.ok) {
    return json(mutationOriginForbiddenBody(), 403);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(restoreCredentialError('validation_error', 'Invalid request body.'), 422);
  }
  const parsed = parseRestoreCredentialBody(route, raw);
  if (!parsed.ok) {
    return json(restoreCredentialError('validation_error', 'Invalid restore credential data.'), 422);
  }

  const tenantResolved = resolveTenantFromRequest(request);
  if (!tenantResolved.ok) {
    return json(restoreCredentialError('invalid_tenant', 'Invalid or unsupported host.'), 400);
  }

  const runtime = resolveTenantRuntimeConfigFromRequest(request);
  if (!runtime.ok) {
    if (runtime.reason === 'tenant_backend_not_configured') {
      return tenantBackendNotConfiguredResponse();
    }
    return json(restoreCredentialError('invalid_tenant', 'Invalid or unsupported host.'), 400);
  }

  if (restoreCredentialRouteRequiresSession(route)) {
    return proxyAuthenticatedRestoreRequest(
      request,
      route,
      parsed.body,
      tenantResolved.tenant,
      runtime.config.backendBaseUrl,
    );
  }

  const preAuthRoute = route as 'authentication/options' | 'authentication/verify';
  const upstream = await callRestorePreAuth(
    preAuthRoute,
    parsed.body,
    tenantResolved.tenant,
    runtime.config.backendBaseUrl,
  );
  if (!upstream.response) {
    return json(upstream.body, 502);
  }

  if (preAuthRoute === 'authentication/options') {
    return json(upstream.body, upstream.response.status);
  }

  return authenticationVerifyResponse(upstream.response, upstream.body, tenantResolved.tenant);
}
