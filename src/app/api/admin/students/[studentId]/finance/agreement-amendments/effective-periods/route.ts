import { NextRequest, NextResponse } from 'next/server';
import { resolveAgreementAmendmentEffectivePeriods } from '@/features/admin/student-finance/server/resolve-agreement-amendment-effective-periods';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> },
) {
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
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : result.error.code === 'unauthorized' ? 401 : 422,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
