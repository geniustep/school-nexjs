// BFF session probe for mobile clients — same envelope as login's `/me` payload.
// Forwards optional X-SSC-Active-Role / ?active_role= to Odoo for multi-role sessions.

import { NextResponse } from 'next/server';
import { guardTenantFromRequest } from '@/lib/auth/tenant-guard';
import { jsonMeFromSession } from '@/lib/auth/me-response';
import { getActiveRoleCookie } from '@/lib/auth/active-role-preference';
import {
  activeRoleErrorBody,
  resolveActiveRoleFromRequest,
} from '@/lib/auth/active-role-transport';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const tenantGuard = await guardTenantFromRequest(request);
  if (!tenantGuard.ok) return tenantGuard.response;

  const fromRequest = resolveActiveRoleFromRequest(request);
  if (!fromRequest.ok) {
    return NextResponse.json(activeRoleErrorBody(fromRequest.code, fromRequest.message), {
      status: 400,
    });
  }
  const activeRole =
    fromRequest.role ?? (await getActiveRoleCookie()) ?? undefined;

  return jsonMeFromSession({ activeRole });
}
