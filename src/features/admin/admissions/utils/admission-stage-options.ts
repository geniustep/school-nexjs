import type { AdmissionState } from '@/types/admission';
import { isAdmissionConvertedToStudent } from './admission-registration';

/** Manual follow-up stages only — never include derived/decision/offer outcomes. */
export const ADMISSION_MANUAL_STAGES = [
  'new',
  'contacted',
  'qualified',
  'visit_pending',
  'under_review',
] as const;

export type AdmissionManualStage = (typeof ADMISSION_MANUAL_STAGES)[number];

export function getAdmissionManualStageOptions(): readonly AdmissionManualStage[] {
  return ADMISSION_MANUAL_STAGES;
}

export function isAdmissionManualStage(state: string | null | undefined): state is AdmissionManualStage {
  return ADMISSION_MANUAL_STAGES.includes(String(state ?? '') as AdmissionManualStage);
}

/** Label key for a manual stage — always `admin.admissions.states.*`. */
export function admissionManualStageLabelKey(stage: AdmissionManualStage): string {
  return `admin.admissions.states.${stage}`;
}

export type ManualStageChangeReason =
  | 'same_state'
  | 'not_manual_current'
  | 'registered'
  | 'invalid_target';

export interface ManualStageChangeDecision {
  apply: boolean;
  targetState: AdmissionManualStage | null;
  reason?: ManualStageChangeReason;
}

/**
 * Manual stage PATCH rules:
 * - only from a manual stage to another manual stage
 * - never from accepted/confirmed/lost/registered/etc.
 */
export function evaluateManualStageChange(
  record: {
    state?: string | null;
    student_id?: number | false | null;
    registration_flow_state?: string | null;
  },
  target: string,
): ManualStageChangeDecision {
  if (isAdmissionConvertedToStudent(record)) {
    return { apply: false, targetState: null, reason: 'registered' };
  }
  if (!isAdmissionManualStage(String(record.state ?? ''))) {
    return { apply: false, targetState: null, reason: 'not_manual_current' };
  }
  if (!isAdmissionManualStage(target)) {
    return { apply: false, targetState: null, reason: 'invalid_target' };
  }
  if (String(record.state) === target) {
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
    value === 'duplicate'
  );
}

export type { AdmissionState };
