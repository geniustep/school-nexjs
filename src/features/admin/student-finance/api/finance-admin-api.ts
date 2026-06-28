'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  CreateFinancialAgreementPayload,
  CreateAgreementAdjustmentPayload,
  FinancialAgreement,
  FinancialAgreementAdjustment,
  FinanceServiceCatalogItem,
  FinanceServiceTariff,
  InstallmentListParams,
  SchedulePreviewResult,
  StudentFinanceWorkspace,
  StudentInstallment,
  UpdateFinancialAgreementPayload,
} from '../types';
import type { ChangePlanPayload } from '@/types/student-finance-change-plan';
import type {
  AgreementAmendmentPreviewResponse,
  AgreementAmendmentRequestPayload,
  AgreementAmendmentPeriodOption,
} from '../types/agreement-amendment';
import type { CancelFutureTargetState } from '../utils/cancel-future-validation';
import type {
  FinanceRepairActionPayload,
  FinanceRepairApplyResponse,
} from '../types/finance-repair';
import type {
  ResetFinancialAgreementPayload,
  ResetFinancialAgreementMode,
} from '../utils/build-reset-financial-agreement-payload';

export interface ResetFinancialAgreementResponse {
  new_agreement?: unknown;
  billing_partner?: unknown;
  finance_operations_history?: unknown[];
  finance_workspace?: StudentFinanceWorkspace;
  warning?: string;
  old_amount?: number;
  new_amount?: number;
}

export type { ResetFinancialAgreementPayload, ResetFinancialAgreementMode };

export async function fetchStudentFinanceWorkspace(
  studentId: number | string,
  query?: ListParams,
): Promise<ApiResponse<StudentFinanceWorkspace>> {
  return api.get<StudentFinanceWorkspace>(endpoints.admin.studentFinanceWorkspace(studentId), query);
}

export async function fetchStudentFinancialAgreements(
  studentId: number | string,
  query?: ListParams,
): Promise<ApiResponse<FinancialAgreement[]>> {
  return api.get<FinancialAgreement[]>(
    endpoints.admin.studentFinancialAgreements(studentId),
    query,
  );
}

export async function fetchFinancialAgreement(
  agreementId: number | string,
  query?: ListParams,
): Promise<ApiResponse<FinancialAgreement>> {
  return api.get<FinancialAgreement>(endpoints.admin.financialAgreement(agreementId), query);
}

export async function createFinancialAgreement(
  studentId: number | string,
  payload: CreateFinancialAgreementPayload,
  query?: ListParams,
): Promise<ApiResponse<FinancialAgreement>> {
  return api.post<FinancialAgreement>(
    endpoints.admin.studentFinancialAgreements(studentId),
    payload,
    query,
  );
}

export async function updateFinancialAgreement(
  agreementId: number | string,
  payload: UpdateFinancialAgreementPayload,
  query?: ListParams,
): Promise<ApiResponse<FinancialAgreement>> {
  return api.patch<FinancialAgreement>(
    endpoints.admin.financialAgreement(agreementId),
    payload,
    query,
  );
}

export async function postAgreementAction(
  agreementId: number | string,
  action: 'submit' | 'approve' | 'activate' | 'cancel',
  body?: Record<string, unknown>,
  query?: ListParams,
): Promise<ApiResponse<FinancialAgreement>> {
  const pathByAction = {
    submit: endpoints.admin.financialAgreementSubmit(agreementId),
    approve: endpoints.admin.financialAgreementApprove(agreementId),
    activate: endpoints.admin.financialAgreementActivate(agreementId),
    cancel: endpoints.admin.financialAgreementCancel(agreementId),
  } as const;
  return api.post<FinancialAgreement>(pathByAction[action], body, query);
}

export async function fetchAgreementSchedule(
  agreementId: number | string,
  query?: ListParams,
): Promise<ApiResponse<{ agreement_id: number; installments: FinancialAgreement['installments']; total?: number }>> {
  return api.get(endpoints.admin.financialAgreementSchedule(agreementId), query);
}

export async function previewAgreementSchedule(
  agreementId: number | string,
  payload: Record<string, unknown>,
  query?: ListParams,
): Promise<ApiResponse<SchedulePreviewResult>> {
  return api.post<SchedulePreviewResult>(
    endpoints.admin.financialAgreementSchedulePreview(agreementId),
    payload,
    query,
  );
}

export async function generateAgreementSchedule(
  agreementId: number | string,
  payload?: Record<string, unknown>,
  query?: ListParams,
): Promise<ApiResponse<FinancialAgreement>> {
  return api.post<FinancialAgreement>(
    endpoints.admin.financialAgreementScheduleGenerate(agreementId),
    payload,
    query,
  );
}

export async function cancelFutureAgreementInstallments(
  agreementId: number | string,
  payload: { effective_date: string; reason: string; target_state?: CancelFutureTargetState | string },
  query?: ListParams,
): Promise<ApiResponse<FinancialAgreement>> {
  return api.post<FinancialAgreement>(
    endpoints.admin.financialAgreementScheduleCancelFuture(agreementId),
    payload,
    query,
  );
}

export async function fetchStudentInstallments(
  studentId: number | string,
  query?: InstallmentListParams,
): Promise<ApiResponse<StudentInstallment[]>> {
  return api.get<StudentInstallment[]>(endpoints.admin.studentInstallments(studentId), query);
}

export async function createAgreementFromCurrentFees(
  studentId: number | string,
  academicYearId?: number | null,
  query?: ListParams,
): Promise<ApiResponse<FinancialAgreement>> {
  const body =
    academicYearId != null && !Number.isNaN(academicYearId)
      ? { academic_year_id: academicYearId }
      : {};
  return api.post<FinancialAgreement>(
    endpoints.admin.studentFinanceAgreementCreateFromCurrentFees(studentId),
    body,
    query,
  );
}

export async function createAgreementAdjustment(
  agreementId: number | string,
  payload: CreateAgreementAdjustmentPayload,
  query?: ListParams,
): Promise<ApiResponse<FinancialAgreementAdjustment>> {
  return api.post<FinancialAgreementAdjustment>(
    endpoints.admin.financeAgreementAdjustments(agreementId),
    payload,
    query,
  );
}

export async function updateAgreementAdjustment(
  agreementId: number | string,
  adjustmentId: number | string,
  payload: Partial<CreateAgreementAdjustmentPayload>,
  query?: ListParams,
): Promise<ApiResponse<FinancialAgreementAdjustment>> {
  return api.patch<FinancialAgreementAdjustment>(
    endpoints.admin.financeAgreementAdjustment(agreementId, adjustmentId),
    payload,
    query,
  );
}

export async function deleteAgreementAdjustment(
  agreementId: number | string,
  adjustmentId: number | string,
  query?: ListParams,
): Promise<ApiResponse<unknown>> {
  return api.delete(
    endpoints.admin.financeAgreementAdjustment(agreementId, adjustmentId),
    query,
  );
}

export async function fetchFinanceServices(
  query?: ListParams,
): Promise<ApiResponse<FinanceServiceCatalogItem[]>> {
  return api.get<FinanceServiceCatalogItem[]>(endpoints.admin.financeServices, query);
}

export async function fetchFinanceServiceTariffs(
  query?: ListParams,
): Promise<ApiResponse<FinanceServiceTariff[]>> {
  return api.get<FinanceServiceTariff[]>(endpoints.admin.financeServiceTariffs, query);
}

export async function previewStudentChangePlan(
  studentId: number | string,
  payload: ChangePlanPayload,
  query?: ListParams,
): Promise<ApiResponse<unknown>> {
  return api.post<unknown>(
    endpoints.admin.financeStudentChangePlanPreview(studentId),
    payload,
    query,
  );
}

export async function applyStudentChangePlan(
  studentId: number | string,
  payload: ChangePlanPayload,
  query?: ListParams,
): Promise<ApiResponse<unknown>> {
  return api.post<unknown>(
    endpoints.admin.financeStudentChangePlanApply(studentId),
    payload,
    query,
  );
}

export async function postResetFinancialAgreement(
  studentId: number | string,
  payload: ResetFinancialAgreementPayload,
  query?: ListParams,
): Promise<ApiResponse<ResetFinancialAgreementResponse>> {
  return api.post<ResetFinancialAgreementResponse>(
    endpoints.admin.studentFinanceResetAgreement(studentId),
    payload,
    query,
  );
}

/** Alias aligned with finance admin naming conventions. */
export const financeResetFinancialAgreement = postResetFinancialAgreement;

export async function previewAgreementAmendment(
  studentId: number | string,
  payload: AgreementAmendmentRequestPayload,
  query?: ListParams,
): Promise<ApiResponse<AgreementAmendmentPreviewResponse>> {
  return api.post<AgreementAmendmentPreviewResponse>(
    endpoints.admin.studentFinanceAgreementAmendmentPreview(studentId),
    payload,
    query,
  );
}

export async function applyAgreementAmendment(
  studentId: number | string,
  payload: AgreementAmendmentRequestPayload,
  query?: ListParams,
): Promise<ApiResponse<unknown>> {
  return api.post<unknown>(
    endpoints.admin.studentFinanceAgreementAmendmentApply(studentId),
    payload,
    query,
  );
}

/**
 * Finance Repair Center — diagnostics, preview, apply.
 * These wrap the documented Odoo contract only; no new endpoints are assumed.
 */
export async function fetchFinanceRepairDiagnostics(
  studentId: number | string,
  query?: ListParams,
): Promise<ApiResponse<unknown>> {
  return api.get<unknown>(endpoints.admin.studentFinanceRepairDiagnostics(studentId), query);
}

export async function previewFinanceRepairAction(
  studentId: number | string,
  actionCode: string,
  payload?: FinanceRepairActionPayload,
  query?: ListParams,
): Promise<ApiResponse<unknown>> {
  return api.post<unknown>(
    endpoints.admin.studentFinanceRepairActionPreview(studentId, actionCode),
    payload ?? {},
    query,
  );
}

export async function applyFinanceRepairAction(
  studentId: number | string,
  actionCode: string,
  payload: FinanceRepairActionPayload,
  query?: ListParams,
): Promise<ApiResponse<FinanceRepairApplyResponse>> {
  return api.post<FinanceRepairApplyResponse>(
    endpoints.admin.studentFinanceRepairActionApply(studentId, actionCode),
    payload,
    query,
  );
}

export async function fetchAgreementAmendmentEffectivePeriods(
  studentId: number | string,
  agreementId: number,
): Promise<ApiResponse<AgreementAmendmentPeriodOption[]>> {
  const params = new URLSearchParams({ agreement_id: String(agreementId) });
  const res = await fetch(
    `/api/admin/students/${studentId}/finance/agreement-amendments/effective-periods?${params.toString()}`,
    { method: 'GET', credentials: 'same-origin', cache: 'no-store' },
  );
  return res.json();
}
