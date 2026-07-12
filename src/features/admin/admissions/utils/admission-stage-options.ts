import {
  FOLLOW_UP_PROCESSING_STAGES,
  isFollowUpProcessingStage,
  type FollowUpProcessingStage,
} from './admission-assessment-workflow-contract';
import { isAdmissionConvertedToStudent } from './admission-registration';

/**
 * Drag / manual processing-stage targets for follow_up kanban.
 * Visit is an activity/appointment — not a processing stage.
 */
export const ADMISSION_MANUAL_PROCESSING_STAGES = FOLLOW_UP_PROCESSING_STAGES;

export type AdmissionManualProcessingStage = FollowUpProcessingStage;

/** @deprecated Legacy writable states — kept for compatibility history only. */
export const ADMISSION_MANUAL_STAGES = [
  'new',
  'contacted',
  'qualified',
  'visit_pending',
  'under_review',
] as const;

/** Canonical manual/drag targets are processing stages (Odoo 185). */
export type AdmissionManualStage = AdmissionManualProcessingStage;

export function getAdmissionManualStageOptions(): readonly AdmissionManualProcessingStage[] {
  return ADMISSION_MANUAL_PROCESSING_STAGES;
}

export function isAdmissionManualStage(
  state: string | null | undefined,
): state is AdmissionManualProcessingStage {
  return isFollowUpProcessingStage(state);
}

/** Label key for a processing stage — `admin.admissions.processingStages.*`. */
export function admissionManualStageLabelKey(
  stage: AdmissionManualProcessingStage | string,
): string {
  if (isFollowUpProcessingStage(stage) || stage === 'assessment_in_progress' || stage === 'decision_ready') {
    return `admin.admissions.processingStages.${stage}`;
  }
  // Legacy compatibility labels (not canonical filter options).
  return `admin.admissions.states.${stage}`;
}

export type ManualStageChangeReason =
  | 'same_state'
  | 'not_manual_current'
  | 'registered'
  | 'invalid_target';

export interface ManualStageChangeDecision {
  apply: boolean;
  targetState: AdmissionManualProcessingStage | null;
  reason?: ManualStageChangeReason;
}

/**
 * Processing-stage PATCH rules for follow_up drag:
 * - only between new / initial_follow_up / assessment_ready
 * - never into assessment_in_progress / decision_ready / acceptance states
 */
export function evaluateManualStageChange(
  record: {
    state?: string | null;
    processing_stage?: string | null;
    student_id?: number | false | null;
    registration_flow_state?: string | null;
  },
  target: string,
): ManualStageChangeDecision {
  if (isAdmissionConvertedToStudent(record)) {
    return { apply: false, targetState: null, reason: 'registered' };
  }
  const current =
    (isFollowUpProcessingStage(record.processing_stage)
      ? record.processing_stage
      : null) ??
    (isFollowUpProcessingStage(record.state) ? record.state : null);
  if (!current) {
    return { apply: false, targetState: null, reason: 'not_manual_current' };
  }
  if (!isFollowUpProcessingStage(target)) {
    return { apply: false, targetState: null, reason: 'invalid_target' };
  }
  if (current === target) {
    return { apply: false, targetState: null, reason: 'same_state' };
  }
  return { apply: true, targetState: target };
}

export function isDerivedOrTerminalAdmissionState(state: string | null | undefined): boolean {
  const value = String(state ?? '');
  return (
    value === 'accepted' ||
    value === 'waitlisted' ||
    value === 'offer_sent' ||
    value === 'confirmed' ||
    value === 'lost' ||
    value === 'cancelled' ||
    value === 'duplicate' ||
    value === 'assessment_in_progress' ||
    value === 'decision_ready'
  );
}

export { isFollowUpProcessingStage };
