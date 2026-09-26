import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { StudentAcademicPlacementCorrectPayload } from '@/types/student-360';
import type { CarryForwardPlanChangePreviewPayload } from '@/types/student-finance-change-plan';

export function correctStudentAcademicPlacement(
  studentId: number | string,
  payload: StudentAcademicPlacementCorrectPayload,
) {
  return api.post<unknown>(
    endpoints.admin.studentAcademicPlacementCorrect(studentId),
    payload,
  );
}

export function previewStudentAcademicPlacementFinanceTransition(
  studentId: number | string,
  payload: CarryForwardPlanChangePreviewPayload,
) {
  return api.post<unknown>(
    endpoints.admin.financeStudentChangePlanPreview(studentId),
    payload,
  );
}
