import { NextRequest, NextResponse } from 'next/server';
import { resolveAgreementAmendmentEffectivePeriods } from '@/features/admin/student-finance/server/resolve-agreement-amendment-effective-periods';
import { tenantBackendNotConfiguredResponse } from '@/lib/api/odoo-backend';
import { getCurrentUser } from '@/lib/api/server';
import { guardTenantFromRequest } from '@/lib/auth/tenant-guard';
import { getHostFromHeaders, resolveTenantRuntimeConfigFromRequest } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> },
) {
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

  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'unauthorized', message: 'Session required.', details: {} },
        meta: {},
      },
      { status: 401 },
    );
  }

  const { studentId } = await context.params;
  const agreementIdRaw = request.nextUrl.searchParams.get('agreement_id');
  const agreementId = agreementIdRaw ? Number(agreementIdRaw) : NaN;

  if (!studentId || !Number.isFinite(agreementId) || agreementId <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'validation_error',
          message: 'studentId and agreement_id are required.',
          details: {},
        },
        meta: {},
      },
      { status: 422 },
    );
  }

  const result = await resolveAgreementAmendmentEffectivePeriods({
    studentId: Number(studentId),
    agreementId,
    tenant: runtime.config.tenantCode,
    backendBaseUrl: runtime.config.backendBaseUrl,
    host: getHostFromHeaders(request.headers),
    userId: user.id,
    activeSchoolId: user.active_school_id ?? null,
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : result.error.code === 'unauthorized' ? 401 : 422,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
