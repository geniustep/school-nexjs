import type { ApiErrorBody } from '@/types/api';
import { sanitizeUserFacingErrorMessage } from '@/lib/utils/user-facing-error';

const TEACHER_DOMAIN_ERROR_KEYS: Record<string, string> = {
  teacher_not_found: 'admin.teacherDomain.errors.teacherNotFound',
  teacher_access_denied: 'admin.teacherDomain.errors.teacherAccessDenied',
  teacher_invalid_state: 'admin.teacherDomain.errors.teacherInvalidState',
  teacher_archive_reason_required: 'admin.teacherDomain.errors.archiveReasonRequired',
  teacher_employment_end_reason_required:
    'admin.teacherDomain.errors.terminateReasonRequired',
  teacher_academic_assignment_boundary:
    'admin.teacherDomain.errors.academicAssignmentBoundary',
  assignment_not_found: 'admin.teacherDomain.errors.assignmentNotFound',
  teaching_assignment_not_found: 'admin.teacherDomain.errors.assignmentNotFound',
  assignment_overlap: 'admin.teacherDomain.errors.assignmentOverlap',
  assignment_scope_mismatch: 'admin.teacherDomain.errors.assignmentScopeMismatch',
  assignment_date_invalid: 'admin.teacherDomain.errors.assignmentDateInvalid',
  assignment_offering_mismatch: 'admin.teacherDomain.errors.assignmentOfferingMismatch',
  assignment_termination_reason_required:
    'admin.teacherDomain.errors.assignmentTerminationReasonRequired',
  teaching_assignment_termination_reason_required:
    'admin.teacherDomain.errors.assignmentTerminationReasonRequired',
  offering_not_found: 'admin.teacherDomain.errors.offeringNotFound',
  offering_overlap: 'admin.teacherDomain.errors.offeringOverlap',
  offering_scope_mismatch: 'admin.teacherDomain.errors.offeringScopeMismatch',
  offering_inactive: 'admin.teacherDomain.errors.offeringInactive',
  offering_archived: 'admin.teacherDomain.errors.offeringArchived',
  capability_required: 'admin.teacherDomain.errors.capabilityRequired',
  invalid_filter: 'admin.teacherDomain.errors.invalidFilter',
  invalid_pagination: 'admin.teacherDomain.errors.invalidPagination',
  validation_error: 'errors.validationFailed',
  forbidden: 'admin.pageForbidden',
  permission_denied: 'admin.pageForbidden',
  not_found: 'admin.teacherDomain.errors.notFound',
  unauthenticated: 'errors.sessionExpired',
};

export function teacherDomainErrorKey(code: string | undefined | null): string | null {
  if (!code) return null;
  return TEACHER_DOMAIN_ERROR_KEYS[code] ?? null;
}

export function mapTeacherDomainError(
  error: Pick<ApiErrorBody, 'code' | 'message' | 'details'> | null | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (!error) return t('errors.generic');
  const key = teacherDomainErrorKey(error.code);
  if (key) {
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return sanitizeUserFacingErrorMessage(error.message, t('errors.generic'));
}

export function teacherDomainFieldErrors(
  details: Record<string, unknown> | undefined | null,
): Record<string, string> {
  if (!details || typeof details !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === 'string') out[key] = value;
    else if (Array.isArray(value) && typeof value[0] === 'string') out[key] = value[0];
  }
  return out;
}
