import { NextRequest, NextResponse } from 'next/server';
import { tenantBackendNotConfiguredResponse } from '@/lib/api/odoo-backend';
import {
  assertMutationOrigin,
  mutationOriginForbiddenBody,
} from '@/lib/api/mutation-origin';
import {
  activeRoleErrorBody,
  resolveActiveRoleFromRequest,
} from '@/lib/auth/active-role-transport';
import { getActiveRoleCookie } from '@/lib/auth/active-role-preference';
import { guardTenantFromRequest } from '@/lib/auth/tenant-guard';
import { resolveTenantRuntimeConfigFromRequest } from '@/lib/tenant';
import {
  convertFamilyBatchApplications,
  hostFromRequestHeaders,
  resolveConvertBatchIdParam,
} from '@/features/admin/admissions/server/convert-family-batch-applications';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ batchId: string }> };

/**
 * BFF: POST /api/admin/admissions/family-batches/{batchId}/convert-to-students
 * → Odoo POST /api/v1/admin/admissions/family-batches/{batch_id}/convert-to-students
 */
export async function POST(request: NextRequest, ctx: Ctx) {
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

  const originCheck = assertMutationOrigin(request, 'POST');
  if (!originCheck.ok) {
    return NextResponse.json(mutationOriginForbiddenBody(), { status: 403 });
  }

  const roleResolved = resolveActiveRoleFromRequest(request);
  if (!roleResolved.ok) {
    return NextResponse.json(activeRoleErrorBody(roleResolved.code, roleResolved.message), {
      status: 400,
    });
  }
  const activeRole = roleResolved.role ?? (await getActiveRoleCookie()) ?? undefined;

  const { batchId: batchIdRaw } = await ctx.params;
  const batchId = resolveConvertBatchIdParam(batchIdRaw);
  if (batchId == null) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'validation_error',
          message: 'batch_id must be a positive integer.',
          details: {},
        },
        meta: {},
      },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'validation_error',
          message: 'Request body must be valid JSON.',
          details: {},
        },
        meta: {},
      },
      { status: 400 },
    );
  }

  const result = await convertFamilyBatchApplications({
    batchId,
    body,
    activeRole,
    host: hostFromRequestHeaders(request.headers),
    backendBaseUrl: runtime.config.backendBaseUrl,
  });

  return NextResponse.json(result.body, {
    status: result.httpStatus,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
