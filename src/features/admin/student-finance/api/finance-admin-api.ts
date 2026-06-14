'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  CreateFinancialAgreementPayload,
  FinancialAgreement,
  FinanceServiceCatalogItem,
  FinanceServiceTariff,
  InstallmentListParams,
  SchedulePreviewResult,
  StudentFinanceWorkspace,
  StudentInstallment,
  UpdateFinancialAgreementPayload,
} from '../types';
import type { CancelFutureTargetState } from '../utils/cancel-future-validation';

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
