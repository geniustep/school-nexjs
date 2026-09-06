import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { guardTenantFromRequest } from '@/lib/auth/tenant-guard';
import { odooApiFetch } from '@/lib/api/odoo-server';
import { config } from '@/lib/config';
import { activeRoleCookieOptions } from '@/lib/auth/active-role-preference';
import { activeSchoolCookieOptions } from '@/lib/auth/active-school';
import { normalizeMeUser } from '@/lib/auth/normalize-user';
import { homeForUser } from '@/lib/routes/role-routes';
import type { ActiveUserContext, CurrentUser, Role } from '@/types/user';

export const dynamic = 'force-dynamic';

const ROLES = new Set<Role>(['admin', 'teacher', 'parent', 'student']);

function errorBody(code: string, message: string) {
  return { success: false as const, error: { code, message, details: {} }, meta: {} };
}

export async function POST(request: Request) {
  const tenantGuard = await guardTenantFromRequest(request);
  if (!tenantGuard.ok) return tenantGuard.response;

  let payload: { school_id?: unknown; role?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(errorBody('invalid_context', 'Invalid context.'), { status: 400 });
  }

  const schoolId = Number(payload.school_id);
  const role = typeof payload.role === 'string' ? (payload.role.trim().toLowerCase() as Role) : null;
  if (!Number.isInteger(schoolId) || schoolId <= 0 || !role || !ROLES.has(role)) {
    return NextResponse.json(errorBody('invalid_context', 'Invalid context.'), { status: 400 });
  }

  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;
  const upstream = await odooApiFetch<{ user?: CurrentUser; active_context?: ActiveUserContext }>(
    '/me/context',
    {
      method: 'POST',
      sessionId,
      body: { school_id: schoolId, role },
    },
  );

  if (upstream.kind !== 'json') {
    return NextResponse.json(errorBody('server_error', 'Unexpected server response.'), {
      status: 502,
    });
  }
  if (!upstream.body.success) {
    return NextResponse.json(upstream.body, { status: upstream.status });
  }

  const rawUser = upstream.body.data?.user;
  if (!rawUser) {
    return NextResponse.json(errorBody('server_error', 'Server did not return the user.'), {
      status: 502,
    });
  }

  const user = normalizeMeUser(rawUser);
  const active = user.active_context ?? upstream.body.data?.active_context ?? null;
  if (
    !active ||
    active.school_id !== schoolId ||
    active.role !== role ||
    user.active_role !== role
  ) {
    return NextResponse.json(
      errorBody('context_not_available', 'The server did not confirm the selected context.'),
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    success: true,
    data: { user, active_context: active, home: homeForUser(user) },
    meta: {},
  });

  response.cookies.set(config.activeRoleCookieName, role, activeRoleCookieOptions());
  if (role === 'admin') {
    response.cookies.set(config.activeSchoolCookieName, String(schoolId), activeSchoolCookieOptions());
  }

  return response;
}
