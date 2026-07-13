import type { AdmissionDetail, AdmissionState } from '@/types/admission';
import { hasAdmissionAllowedAction } from './admission-allowed-actions';
import { shouldBlockStudentConversion, isAdmissionTerminal } from './admission-rejection';
import { formatAdmissionReference } from './admission-labels';
import { resolveProcessingStage } from './admission-assessment-workflow-contract';

const CLOSED_REGISTRATION_STATES = new Set<AdmissionState>(['lost', 'cancelled', 'duplicate']);

export function resolveAdmissionStudentId(value: unknown): number | null {
  if (value === false || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Linkage / "converted to official student" detection.
 *
 * Data-contract fields actually used (no new fields assumed):
 *   - `student_id`  (number | false | null) — present on both detail and (when
 *     serialized) list payloads. A positive number means a linked student.
 *   - `registration_flow_state === 'linked'` — explicit conversion flag.
 */
export function isAdmissionLinkedRecord(
  record: { student_id?: number | false | null; registration_flow_state?: string | null },
): boolean {
  if (resolveAdmissionStudentId(record.student_id) != null) return true;
  return record.registration_flow_state === 'linked';
}

export function isAdmissionLinked(detail: Pick<AdmissionDetail, 'student_id' | 'registration_flow_state'>): boolean {
  return isAdmissionLinkedRecord(detail);
}

/** A linked admission is considered converted to an official student. */
export function isAdmissionConvertedToStudent(
  record: { student_id?: number | false | null; registration_flow_state?: string | null },
): boolean {
  return isAdmissionLinkedRecord(record);
}

export function canContinueStudentRegistration(detail: AdmissionDetail): boolean {
  if (!hasAdmissionAllowedAction(detail.allowed_actions, 'get_prefill')) return false;
  if (isAdmissionLinked(detail)) return false;
  if (shouldBlockStudentConversion(detail)) return false;
  if (CLOSED_REGISTRATION_STATES.has(detail.state as AdmissionState)) return false;
  return true;
}

/**
 * Convert-to-student at any processing stage (opens existing student create + prefill).
 * Does not create the student; does not mutate admission stage on click.
 * Linked admissions must use open-student instead (no duplicate conversion).
 */
export function canConvertAdmissionToStudentAnyStage(
  detail: Pick<
    AdmissionDetail,
    | 'student_id'
    | 'registration_flow_state'
    | 'state'
    | 'is_terminal'
    | 'can_link_student'
    | 'allowed_actions'
  >,
): boolean {
  if (isAdmissionLinkedRecord(detail)) return false;
  if (isAdmissionTerminal(detail)) return false;
  if (CLOSED_REGISTRATION_STATES.has(detail.state as AdmissionState)) return false;
  if (detail.can_link_student === false) return false;
  return true;
}

/** Non-blocking hint when converting before readiness / late pipeline stages. */
export function shouldShowEarlyStudentConversionHint(
  detail: Pick<
    AdmissionDetail,
    | 'processing_stage'
    | 'state'
    | 'registration_readiness'
    | 'student_id'
    | 'registration_flow_state'
  >,
): boolean {
  if (isAdmissionLinkedRecord(detail)) return false;
  const readiness = String(detail.registration_readiness ?? '').trim();
  if (readiness === 'ready' || readiness === 'registered') return false;
  const stage = resolveProcessingStage(detail);
  return (
    stage === 'new' ||
    stage === 'initial_follow_up' ||
    stage === 'assessment_ready' ||
    stage === 'assessment_in_progress' ||
    stage === 'decision_ready' ||
    !stage
  );
}

export function buildContinueRegistrationHref(admissionId: number | string): string {
  return `/admin/students/new?admission_id=${admissionId}`;
}

export function buildOpenStudentHref(studentId: number): string {
  return `/admin/students/${studentId}`;
}

export function admissionDisplayReference(detail: Pick<AdmissionDetail, 'id' | 'reference' | 'name'>): string {
  if (detail.name?.trim()) return detail.name.trim();
  return formatAdmissionReference(detail.id, detail.reference);
}

export function hasAdmissionReadinessWarnings(detail: AdmissionDetail): boolean {
  const readiness = detail.readiness;
  if (!readiness || typeof readiness !== 'object') return false;
  const blocking = (readiness as { blocking_issues?: unknown[] }).blocking_issues;
  const warnings = (readiness as { warnings?: unknown[] }).warnings;
  return (blocking?.length ?? 0) > 0 || (warnings?.length ?? 0) > 0;
}
