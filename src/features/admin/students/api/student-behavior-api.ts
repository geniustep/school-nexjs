import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  BehaviorEventCatalog,
  BehaviorEventCreateResponse,
  BehaviorIncident,
  StudentBehaviorSnapshot,
} from '@/types/student-behavior';

type ActiveSchoolId = number | null | undefined;

function schoolQuery(activeSchoolId: ActiveSchoolId) {
  return activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
}

export function fetchStudentBehavior(
  studentId: number | string,
  activeSchoolId: ActiveSchoolId,
  academicYearId?: number | null,
) {
  return api.get<StudentBehaviorSnapshot>(
    endpoints.admin.studentBehavior(studentId),
    {
      ...(schoolQuery(activeSchoolId) ?? {}),
      ...(academicYearId != null ? { academic_year_id: academicYearId } : {}),
    },
  );
}

export function fetchBehaviorEventTypes(activeSchoolId: ActiveSchoolId) {
  return api.get<BehaviorEventCatalog>(
    endpoints.admin.studentBehaviorEventTypes,
    schoolQuery(activeSchoolId),
  );
}

export function recordBehaviorEvent(
  studentId: number | string,
  activeSchoolId: ActiveSchoolId,
  payload: {
    event_type_code: string;
    note?: string;
    occurred_at?: string;
    academic_year_id?: number;
    idempotency_key: string;
  },
) {
  return api.post<BehaviorEventCreateResponse>(
    endpoints.admin.studentBehaviorEvents(studentId),
    payload,
    schoolQuery(activeSchoolId),
  );
}

export function reverseBehaviorEvent(
  studentId: number | string,
  eventId: number,
  activeSchoolId: ActiveSchoolId,
  reason: string,
) {
  return api.post<StudentBehaviorSnapshot>(
    endpoints.admin.studentBehaviorEventReverse(studentId, eventId),
    { reason },
    schoolQuery(activeSchoolId),
  );
}

export function recoverBehaviorScore(
  studentId: number | string,
  activeSchoolId: ActiveSchoolId,
  payload: { amount: number; reason: string; academic_year_id?: number },
) {
  return api.post<StudentBehaviorSnapshot>(
    endpoints.admin.studentBehaviorRecovery(studentId),
    payload,
    schoolQuery(activeSchoolId),
  );
}

export function resolveBehaviorIncident(
  studentId: number | string,
  incidentId: number,
  activeSchoolId: ActiveSchoolId,
  resolutionNote: string,
) {
  return api.post<BehaviorIncident>(
    endpoints.admin.studentBehaviorIncidentResolve(studentId, incidentId),
    { resolution_note: resolutionNote },
    schoolQuery(activeSchoolId),
  );
}
