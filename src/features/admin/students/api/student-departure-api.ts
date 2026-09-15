import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  StudentDepartureConfirmPayload,
  StudentDepartureConfirmResult,
  StudentDepartureDecisionPayload,
  StudentDeparturePreview,
} from '@/types/student-departure';

function departureBase(studentId: number | string): string {
  return `${endpoints.admin.student(studentId)}/departure`;
}

export function previewStudentDeparture(
  studentId: number | string,
  payload: StudentDepartureDecisionPayload,
) {
  return api.post<StudentDeparturePreview>(`${departureBase(studentId)}/preview`, payload);
}

export function confirmStudentDeparture(
  studentId: number | string,
  payload: StudentDepartureConfirmPayload,
) {
  return api.post<StudentDepartureConfirmResult>(
    `${departureBase(studentId)}/confirm`,
    payload,
    undefined,
    { 'Idempotency-Key': payload.idempotency_key },
  );
}
