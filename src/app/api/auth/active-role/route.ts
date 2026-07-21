import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api/server';
import {
  activeRoleCookieOptions,
} from '@/lib/auth/active-role-preference';
import {
  isLegalActiveRole,
  normalizeRoleCode,
  resolveConfirmedActiveRole,
  resolveEffectiveRole,
  userOwnsRole,
} from '@/lib/auth/active-role-workspace';
import { guardTenantFromRequest } from '@/lib/auth/tenant-guard';
import { homeForUser } from '@/lib/routes/role-routes';
import { config } from '@/lib/config';
import type { LegalActiveRole } from '@/lib/auth/active-role-transport';

export const dynamic = 'force-dynamic';

function errorBody(code: string, message: string) {
  return {
    success: false as const,
    error: { code, message, details: {} },
    meta: {},
  };
}

export async function POST(request: Request) {
  const tenantGuard = await guardTenantFromRequest(request);
  if (!tenantGuard.ok) return tenantGuard.response;

  let payload: { active_role?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(errorBody('validation_error', 'Invalid request body.'), {
      status: 422,
    });
  }

  const requestedRaw = normalizeRoleCode(payload.active_role);
  if (!requestedRaw || !isLegalActiveRole(requestedRaw)) {
    return NextResponse.json(errorBody('invalid_active_role', 'Invalid active role.'), {
      status: 400,
    });
  }
  const requested = requestedRaw as LegalActiveRole;

  // Probe ownership with default session first (no invented role).
  const baseline = await getCurrentUser();
  if (!baseline) {
    return NextResponse.json(errorBody('unauthenticated', 'No active session.'), {
      status: 401,
    });
  }

  if (!userOwnsRole(baseline, requested)) {
    return NextResponse.json(
      errorBody('role_not_available', 'This role is not available for your account.'),
      { status: 403 },
    );
  }

  // Confirm with Odoo using the requested role — do not trust the UI alone.
  const confirmed = await getCurrentUser(requested);
  if (!confirmed) {
    return NextResponse.json(errorBody('unauthenticated', 'No active session.'), {
      status: 401,
    });
  }

  const confirmedRole = resolveConfirmedActiveRole(confirmed);
  if (confirmedRole !== requested || resolveEffectiveRole(confirmed) !== requested) {
    return NextResponse.json(
      errorBody(
        'role_not_available',
        'The server did not confirm the selected role. Your previous role was kept.',
      ),
      { status: 403 },
    );
  }

  if (!userOwnsRole(confirmed, requested)) {
    return NextResponse.json(
      errorBody('role_not_available', 'This role is not available for your account.'),
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    success: true,
    data: {
      user: confirmed,
      active_role: confirmedRole,
      home: homeForUser(confirmed),
    },
    meta: {},
  });

  response.cookies.set(
    config.activeRoleCookieName,
    confirmedRole,
    activeRoleCookieOptions(),
  );

  return response;
}
