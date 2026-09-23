import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { StudentAcademicPlacementCorrectPayload } from '@/types/student-360';

export function correctStudentAcademicPlacement(
  studentId: number | string,
  payload: StudentAcademicPlacementCorrectPayload,
) {
  return api.post<unknown>(
    endpoints.admin.studentAcademicPlacementCorrect(studentId),
    payload,
  );
}
