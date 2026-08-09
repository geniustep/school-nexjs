import { api } from '@/lib/api/client';
import type { ApiResponse } from '@/types/api';
import type {
  CompensationAgreement,
  CompensationAgreementWrite,
  CompensationLine,
  CompensationPeriod,
  StaffCompensationSummary,
} from '@/types/staff-compensation';

const staffSummaryPath = (staffId: number | string) => `/admin/staff/${staffId}/compensation`;
const staffAgreementsPath = (staffId: number | string) => `/admin/staff/${staffId}/compensation/agreements`;
const staffPeriodsPath = (staffId: number | string) => `/admin/staff/${staffId}/compensation/periods`;
const agreementPath = (agreementId: number | string) => `/admin/staff/compensation/agreements/${agreementId}`;
const agreementEndPath = (agreementId: number | string) => `${agreementPath(agreementId)}/end`;
const periodPath = (periodId: number | string) => `/admin/staff/compensation/periods/${periodId}`;
const periodCalculatePath = (periodId: number | string) => `${periodPath(periodId)}/calculate`;
const periodReviewPath = (periodId: number | string) => `${periodPath(periodId)}/review`;
const periodApprovePath = (periodId: number | string) => `${periodPath(periodId)}/approve`;
const periodStatementPath = (periodId: number | string) => `${periodPath(periodId)}/statement`;
const periodLinesPath = (periodId: number | string) => `${periodPath(periodId)}/lines`;
const linePath = (lineId: number | string) => `/admin/staff/compensation/lines/${lineId}`;
const teacherSummaryPath = (teacherId: number | string) => `/admin/teachers/${teacherId}/compensation`;

export async function fetchStaffCompensationSummary(staffId: number | string): Promise<ApiResponse<StaffCompensationSummary>> {
  return api.get<StaffCompensationSummary>(staffSummaryPath(staffId));
}

export async function fetchTeacherCompensationSummary(teacherId: number | string): Promise<ApiResponse<StaffCompensationSummary>> {
  return api.get<StaffCompensationSummary>(teacherSummaryPath(teacherId));
}

export async function createCompensationAgreement(
  staffId: number | string,
  payload: CompensationAgreementWrite,
): Promise<ApiResponse<CompensationAgreement>> {
  return api.post<CompensationAgreement>(staffAgreementsPath(staffId), payload as unknown as Record<string, unknown>);
}

export async function updateCompensationAgreement(
  agreementId: number | string,
  payload: Partial<CompensationAgreementWrite>,
): Promise<ApiResponse<CompensationAgreement>> {
  return api.patch<CompensationAgreement>(agreementPath(agreementId), payload as unknown as Record<string, unknown>);
}

export async function endCompensationAgreement(
  agreementId: number | string,
  payload: { effective_to?: string; reason?: string },
): Promise<ApiResponse<CompensationAgreement>> {
  return api.post<CompensationAgreement>(agreementEndPath(agreementId), payload);
}

export async function createCompensationPeriod(
  staffId: number | string,
  payload: { period_start: string; period_end: string; agreement_id?: number; name?: string },
): Promise<ApiResponse<CompensationPeriod>> {
  return api.post<CompensationPeriod>(staffPeriodsPath(staffId), payload);
}

export async function fetchCompensationPeriod(periodId: number | string): Promise<ApiResponse<CompensationPeriod>> {
  return api.get<CompensationPeriod>(periodPath(periodId));
}

export async function calculateCompensationPeriod(
  periodId: number | string,
  payload: Record<string, unknown>,
): Promise<ApiResponse<CompensationPeriod>> {
  return api.post<CompensationPeriod>(periodCalculatePath(periodId), payload);
}

export async function reviewCompensationPeriod(
  periodId: number | string,
  reason?: string,
): Promise<ApiResponse<CompensationPeriod>> {
  return api.post<CompensationPeriod>(periodReviewPath(periodId), { reason, mark_reviewed: true });
}

export async function approveCompensationPeriod(
  periodId: number | string,
  reason?: string,
): Promise<ApiResponse<CompensationPeriod>> {
  return api.post<CompensationPeriod>(periodApprovePath(periodId), { reason });
}

export async function fetchCompensationStatement(periodId: number | string): Promise<ApiResponse<Record<string, unknown>>> {
  return api.get<Record<string, unknown>>(periodStatementPath(periodId));
}

export async function addCompensationLine(
  periodId: number | string,
  payload: Omit<CompensationLine, 'id'>,
): Promise<ApiResponse<CompensationLine>> {
  return api.post<CompensationLine>(periodLinesPath(periodId), payload as unknown as Record<string, unknown>);
}

export async function removeCompensationLine(lineId: number | string): Promise<ApiResponse<{ removed: boolean }>> {
  return api.delete<{ removed: boolean }>(linePath(lineId));
}
