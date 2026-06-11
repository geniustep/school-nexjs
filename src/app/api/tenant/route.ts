// Public tenant probe for mobile clients — resolves Host → tenant without a session.

import { NextResponse } from 'next/server';
import { tenantDisplayName } from '@/lib/tenant-public';
import { resolveTenantFromRequest } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

function err(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message, details: {} }, meta: {} },
    { status },
  );
}

export async function GET(request: Request) {
  const resolved = resolveTenantFromRequest(request);
  if (!resolved.ok) {
    const status = resolved.reason === 'missing_host' ? 400 : 404;
    return err('invalid_tenant', 'Invalid or unsupported host.', status);
  }

  const code = resolved.tenant;
  return NextResponse.json(
    {
      success: true,
      data: {
        code,
        name: tenantDisplayName(code),
        active: true,
      },
      meta: {},
    },
    { status: 200 },
  );
}
