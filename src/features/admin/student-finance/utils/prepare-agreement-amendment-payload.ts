import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { parseFinanceQuickListResponse } from '@/lib/utils/finance-list-response';
import type { ApiResponse } from '@/types/api';
import type { StudentInstallment } from '../types';
import type { AgreementAmendmentRequestPayload } from '../types/agreement-amendment';
import { fetchAgreementAmendmentEffectivePeriods } from '../api/finance-admin-api';
import { resolveOperationalInstallmentId } from './resolve-operational-installment-id';

function operationalInstallmentError(
  reason: string,
): ApiResponse<AgreementAmendmentRequestPayload> {
  return {
    success: false,
    error: {
      code: 'operational_installment_id_not_available_to_ui',
      message: 'operational_installment_id_not_available_to_ui',
      details: { reason },
    },
    meta: {},
  };
}

async function fetchAllOperationalInstallments(
  studentId: number | string,
  feeTypeId?: number,
): Promise<ApiResponse<StudentInstallment[]>> {
  const items: StudentInstallment[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params: Record<string, string | number> = {
      student_id: Number(studentId),
      quick: 'all',
      page,
      page_size: 100,
    };
    if (feeTypeId != null && Number.isFinite(feeTypeId)) {
      params.service_id = feeTypeId;
    }

    const res = await api.get<unknown>(endpoints.admin.financeInstallments, params);
    if (!res.success) return res;

    const parsed = parseFinanceQuickListResponse<StudentInstallment>(res.data);
    items.push(...parsed.items);
    totalPages = Math.max(1, Number(res.meta.pagination?.total_pages ?? 1));
    page += 1;
  } while (page <= totalPages);

  return { success: true, data: items, meta: {} };
}

/**
 * Enrich only the single-installment operation with the exact Odoo
 * school.installment id. Other amendment operations pass through unchanged.
 */
export async function prepareAgreementAmendmentPayload(
  studentId: number | string,
  payload: AgreementAmendmentRequestPayload,
): Promise<ApiResponse<AgreementAmendmentRequestPayload>> {
  if (payload.operation_type !== 'adjust_installment_amount') {
    return { success: true, data: payload, meta: {} };
  }

  if (
    payload.line.operational_installment_id != null &&
    Number.isFinite(payload.line.operational_installment_id)
  ) {
    return { success: true, data: payload, meta: {} };
  }

  const agreementLineId = payload.line.agreement_line_id;
  const effectivePeriodId = payload.effective_period_id;
  if (
    agreementLineId == null ||
    !Number.isFinite(agreementLineId) ||
    effectivePeriodId == null ||
    !Number.isFinite(effectivePeriodId)
  ) {
    return operationalInstallmentError('missing_target_identity');
  }

  try {
    // Reuse the normalized same-origin BFF contract. The raw Odoo response may expose
    // top-level `periods` with snake_case boundaries; the BFF converts those fields to
    // `periodStart` / `periodEnd` before this resolver consumes them.
    const periodsRes = await fetchAgreementAmendmentEffectivePeriods(
      studentId,
      payload.agreement_id,
    );
    if (!periodsRes.success) return periodsRes;

    const period = periodsRes.data.find((item) => item.id === effectivePeriodId);
    if (!period?.periodStart || !period.periodEnd) {
      return operationalInstallmentError('effective_period_boundaries_missing');
    }

    const installmentsRes = await fetchAllOperationalInstallments(
      studentId,
      payload.line.fee_type_id,
    );
    if (!installmentsRes.success) return installmentsRes;

    const resolution = resolveOperationalInstallmentId(installmentsRes.data, {
      agreementId: payload.agreement_id,
      agreementLineId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    });
    if (!resolution.ok) {
      return operationalInstallmentError(resolution.reason);
    }

    return {
      success: true,
      data: {
        ...payload,
        line: {
          ...payload.line,
          operational_installment_id: resolution.operationalInstallmentId,
        },
      },
      meta: {},
    };
  } catch {
    // Fail closed and return a normal UI error instead of allowing a rejected read to
    // escape the submit handler and leave the preview action in a loading state.
    return operationalInstallmentError('request_failed');
  }
}
