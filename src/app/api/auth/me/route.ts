// BFF session probe for mobile clients — same envelope as login's `/me` payload.
// Forwards optional X-SSC-Active-Role / ?active_role= to Odoo for multi-role sessions.

import { NextResponse } from 'next/server';
import { guardTenantFromRequest } from '@/lib/auth/tenant-guard';
import { jsonMeFromSession } from '@/lib/auth/me-response';
import {
  activeRoleErrorBody,
  resolveActiveRoleFromRequest,
} from '@/lib/auth/active-role-transport';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const tenantGuard = await guardTenantFromRequest(request);
  if (!tenantGuard.ok) return tenantGuard.response;

  const resolved = resolveActiveRoleFromRequest(request);
  if (!resolved.ok) {
    return NextResponse.json(activeRoleErrorBody(resolved.code, resolved.message), {
      status: 400,
    });
  }

  return jsonMeFromSession({ activeRole: resolved.role });
}
