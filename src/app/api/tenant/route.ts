// Public tenant probe for mobile clients — resolves Host → tenant without a session.

import { NextResponse } from 'next/server';
import { tenantDisplayName } from '@/lib/tenant-public';
import { resolveTenantRuntimeConfigFromRequest } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

function err(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message, details: {} }, meta: {} },
    { status },
  );
}

export async function GET(request: Request) {
  const resolved = resolveTenantRuntimeConfigFromRequest(request);
  if (!resolved.ok) {
    if (resolved.reason === 'tenant_backend_not_configured') {
      return err('TENANT_BACKEND_NOT_CONFIGURED', 'Tenant backend is not configured.', 503);
    }
    const status =
      resolved.reason === 'missing_host' || resolved.reason === 'missing_fallback_db' ? 400 : 404;
    return err('invalid_tenant', 'Invalid or unsupported host.', status);
  }

  const { tenantCode, active, defaultPublicSchoolCode } = resolved.config;
  return NextResponse.json(
    {
      success: true,
      data: {
        tenantCode,
        ...(defaultPublicSchoolCode ? { defaultPublicSchoolCode } : {}),
        name: tenantDisplayName(tenantCode),
        active,
        backendConfigured: Boolean(resolved.config.backendBaseUrl),
        source: resolved.source,
      },
      meta: {},
    },
    { status: 200 },
  );
}
