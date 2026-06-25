import type { AdmissionDetail, AdmissionState } from '@/types/admission';
import { hasAdmissionAllowedAction } from './admission-allowed-actions';
import { formatAdmissionReference } from './admission-labels';

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
  if (CLOSED_REGISTRATION_STATES.has(detail.state as AdmissionState)) return false;
  return true;
}

export function buildContinueRegistrationHref(admissionId: number | string): string {
  return `/admin/students/new?admission_id=${admissionId}`;
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
