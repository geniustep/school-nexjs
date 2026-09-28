import { NextResponse } from 'next/server';
import { endpoints } from '@/lib/api/endpoints';
import { serverPost } from '@/lib/api/server';
import { requireEdgeAdminBffContext } from '@/features/admin/edge/api/bff';
import { resolveTenantRuntimeConfigFromServerHeaders } from '@/lib/tenant';
import type { EdgePairingGrantData, EdgePairingHandoffData } from '@/features/admin/edge/types';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST() {
  const context = await requireEdgeAdminBffContext();
  if (!context.ok) return context.response;

  const tenant = await resolveTenantRuntimeConfigFromServerHeaders();
  if (!tenant.ok) {
    return noStoreJson(
      {
        success: false,
        error: {
          code: 'tenant_backend_not_configured',
          message: 'Tenant backend is not configured.',
          details: {},
        },
        meta: {},
      },
      503,
    );
  }

  const result = await serverPost<EdgePairingGrantData>(endpoints.admin.edgePairingGrants, {});
  if (!result.success) {
    const code = result.error.code;
    const status =
      code === 'unauthenticated'
        ? 401
        : code === 'forbidden' || code === 'permission_denied'
          ? 403
          : code === 'validation_error'
            ? 422
            : 502;
    return noStoreJson(result, status);
  }

  const data: EdgePairingHandoffData = {
    ...result.data,
    cloud_base_url: tenant.config.backendBaseUrl,
  };
  return noStoreJson({ ...result, data });
}
