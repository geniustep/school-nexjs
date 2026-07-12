import type { AdmissionDetail } from '@/types/admission';
import { hasAdmissionAllowedAction } from './admission-allowed-actions';
import { refName } from './admission-labels';
import { normalizeAdmissionDecision } from './normalize-admission-decision';

function isLinkedAdmission(
  detail: Pick<AdmissionDetail, 'student_id' | 'registration_flow_state'>,
): boolean {
  const studentId = detail.student_id;
  if (studentId !== false && studentId != null && Number(studentId) > 0) return true;
  return detail.registration_flow_state === 'linked';
}

/** True only when the backend marks an administrative rejection — not every `lost` state. */
export function isAdmissionRejected(
  detail: Pick<AdmissionDetail, 'rejection' | 'decision' | 'is_school_rejected'>,
): boolean {
  if (detail.is_school_rejected === true) return true;
  if (detail.rejection?.is_rejected === true) return true;
  const decision = detail.decision;
  if (decision && typeof decision === 'object' && decision.decision === 'rejected') return true;
  if (typeof decision === 'string' && decision.trim() === 'rejected') return true;
  return false;
}

export function resolveRejectionReason(
  detail: Pick<AdmissionDetail, 'rejection' | 'lost_reason' | 'decision' | 'decision_notes'>,
): string {
  const fromRejection = detail.rejection?.reason?.trim();
  if (fromRejection) return fromRejection;
  const lostReason = detail.lost_reason?.trim();
  if (lostReason) return lostReason;
  const nested = normalizeAdmissionDecision(detail);
  return nested?.decision_notes?.trim() ?? '';
}

export function resolveRejectionDecidedAt(
  detail: Pick<AdmissionDetail, 'rejection' | 'decision' | 'decision_date'>,
): string | null {
  const fromRejection = detail.rejection?.decided_at?.trim();
  if (fromRejection) return fromRejection;
  const nested = normalizeAdmissionDecision(detail);
  return nested?.decision_date?.trim() ?? null;
}

export function resolveRejectionDecidedBy(
  detail: Pick<AdmissionDetail, 'rejection' | 'decision' | 'decision_user'>,
): string {
  const fromRejection = refName(detail.rejection?.decided_by ?? null);
  if (fromRejection) return fromRejection;
  const nested = normalizeAdmissionDecision(detail);
  return refName(nested?.decision_user ?? null);
}

export function canReopenAdmission(detail: AdmissionDetail): boolean {
  if (detail.can_reopen === true) return true;
  return hasAdmissionAllowedAction(detail.allowed_actions, 'reopen');
}

export function isAdmissionTerminal(detail: Pick<AdmissionDetail, 'is_terminal'>): boolean {
  return detail.is_terminal === true;
}

export function shouldBlockStudentConversion(detail: AdmissionDetail): boolean {
  if (isLinkedAdmission(detail)) return false;
  if (detail.is_terminal === true) return true;
  if (detail.can_link_student === false) return true;
  if (!hasAdmissionAllowedAction(detail.allowed_actions, 'link_student')) return true;
  return false;
}

export function resolveAdmissionBlockingIssues(detail: AdmissionDetail): string[] {
  const readiness = detail.readiness;
  if (!readiness || typeof readiness !== 'object') return [];
  const blocking = (readiness as { blocking_issues?: unknown[] }).blocking_issues;
  if (!Array.isArray(blocking)) return [];
  return blocking.map((item) => String(item).trim()).filter(Boolean);
}
