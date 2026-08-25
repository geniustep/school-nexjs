// BFF login route. Implements the Raqeem application auth flow:
//   1. POST /api/v1/auth/login to obtain the Odoo session cookie while allowing
//      server-side identifier aliases such as parent phone numbers.
//   2. GET /api/v1/me to resolve role + scope.
// The Odoo session id is stored in an httpOnly cookie owned by Next.js, so the
// browser never sees or handles it directly. Odoo-native callers can continue
// using /web/session/authenticate independently of this Raqeem BFF route.

import { NextResponse } from 'next/server';
import { config, cookieSecure } from '@/lib/config';
import { authenticateRaqeem, odooApiFetch } from '@/lib/api/odoo-server';
import { endpoints } from '@/lib/api/endpoints';
import {
  activeSchoolCookieOptions,
  getActiveSchoolCookie,
} from '@/lib/auth/active-school';
import {
  activeRoleCookieOptions,
} from '@/lib/auth/active-role-preference';
import {
  isLegalActiveRole,
  isMultiRoleUser,
  normalizeRoleCode,
} from '@/lib/auth/active-role-workspace';
import { setTenantCookie } from '@/lib/auth/tenant-guard';
import { normalizeMeUser, resolveActiveSchoolId } from '@/lib/auth/normalize-user';
import { resolveTenantFromRequest, resolveTenantRuntimeConfigFromRequest } from '@/lib/tenant';
import { tenantBackendNotConfiguredResponse } from '@/lib/api/odoo-backend';
import type { MeResponse } from '@/types/user';

export const dynamic = 'force-dynamic';

function err(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message, details: {} }, meta: {} },
    { status },
  );
}

export async function POST(request: Request) {
  let payload: { login?: string; password?: string; db?: string; database?: string; odoo_url?: string };
  try {
    payload = await request.json();
  } catch {
    return err('validation_error', 'Invalid request body.', 422);
  }

  if (
    payload.db !== undefined ||
    payload.database !== undefined ||
    payload.odoo_url !== undefined
  ) {
    return err(
      'validation_error',
      'Database selection is determined by the host; do not send db, database, or odoo_url.',
      422,
    );
  }

  const login = payload.login?.trim();
  const password = payload.password;
  if (!login || !password) {
    return err('validation_error', 'Login and password are required.', 422);
  }

  const tenant = resolveTenantFromRequest(request);
  if (!tenant.ok) {
    return err('invalid_tenant', 'Invalid or unsupported host.', 400);
  }

  const runtime = resolveTenantRuntimeConfigFromRequest(request);
  if (!runtime.ok) {
    if (runtime.reason === 'tenant_backend_not_configured') {
      return tenantBackendNotConfiguredResponse();
    }
    return err('invalid_tenant', 'Invalid or unsupported host.', 400);
  }

  const auth = await authenticateRaqeem(
    tenant.tenant,
    login,
    password,
    runtime.config.backendBaseUrl,
  );
  if (!auth.ok || !auth.sessionId) {
    if (auth.errorName === 'tenant_backend_not_configured') {
      return tenantBackendNotConfiguredResponse();
    }
    if (auth.errorName === 'network_error') {
      return err('network_error', 'Could not reach the server. Please try again.', 502);
    }
    // Keep authentication failures deliberately generic. Phone collisions,
    // unknown identifiers, and bad passwords must not become enumeration cues.
    return err('invalid_credentials', 'Invalid login or password.', 401);
  }

  // Resolve the current user (role, permissions, scope) before responding so
  // the client can redirect immediately.
  const me = await odooApiFetch<MeResponse>(endpoints.auth.me, {
    sessionId: auth.sessionId,
    tenant: tenant.tenant,
    backendBaseUrl: runtime.config.backendBaseUrl,
  });

  if (me.kind !== 'json' || !me.body.success) {
    // A valid Odoo user without a school role surfaces here.
    const body = me.kind === 'json' ? me.body : {
      success: false,
      error: { code: 'server_error', message: 'Unexpected response.', details: {} },
      meta: {},
    };
    return NextResponse.json(body, { status: me.status });
  }

  const rawUser = me.body.data.user;
  const normalized = normalizeMeUser(rawUser);
  const cookieSchoolId = await getActiveSchoolCookie();
  const activeId =
    normalized.role === 'admin'
      ? resolveActiveSchoolId(normalized, cookieSchoolId)
      : null;

  const response = NextResponse.json(
    {
      ...me.body,
      data: {
        ...me.body.data,
        user: {
          ...normalized,
          active_school_id: activeId ?? undefined,
        },
      },
    },
    { status: 200 },
  );
  response.cookies.set(config.sessionCookieName, auth.sessionId, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  setTenantCookie(response, tenant.tenant);
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

  // Persist Odoo-confirmed default active role for multi-role sessions (refresh-safe).
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
