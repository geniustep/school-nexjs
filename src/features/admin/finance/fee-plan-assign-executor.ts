import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { buildAssignFeePlanPayload } from '@/features/admin/finance/fee-plan-assign-utils';
import type { AssignStudentFeePayload, AssignStudentFeePlanResponse } from '@/types/finance';

export interface FeePlanAssignStudentInput {
  studentId: number;
  studentName: string;
}

export interface FeePlanAssignStudentResult {
  studentId: number;
  studentName: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  response?: AssignStudentFeePlanResponse;
}

export async function assignFeePlanToStudent(
  studentId: number,
  payload: AssignStudentFeePayload,
): Promise<{ success: true; data: AssignStudentFeePlanResponse } | { success: false; code?: string; message: string }> {
  const res = await api.post<AssignStudentFeePlanResponse>(
    endpoints.admin.financeAssignStudentFee(studentId),
    payload,
  );
  if (!res.success) {
    return { success: false, code: res.error.code, message: res.error.message };
  }
  return { success: true, data: res.data ?? {} };
}

/** Sequential per-student assignment — backend has no bulk endpoint. */
export async function assignFeePlanToStudents(
  students: FeePlanAssignStudentInput[],
  feePlanId: number,
  effectiveDate: string,
  selectedOptionalLineIds: number[],
  onProgress?: (completed: number, total: number) => void,
): Promise<FeePlanAssignStudentResult[]> {
  const payload = buildAssignFeePlanPayload(feePlanId, effectiveDate, selectedOptionalLineIds);
  const results: FeePlanAssignStudentResult[] = [];

  for (let i = 0; i < students.length; i += 1) {
    const { studentId, studentName } = students[i];
    const outcome = await assignFeePlanToStudent(studentId, payload);
    results.push(
      outcome.success
        ? { studentId, studentName, success: true, response: outcome.data }
        : {
            studentId,
            studentName,
            success: false,
            errorCode: outcome.code,
            errorMessage: outcome.message,
          },
    );
    onProgress?.(i + 1, students.length);
  }

  return results;
}
