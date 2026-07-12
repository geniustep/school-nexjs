import type { DecisionType } from '@/types/admission';

/** Canonical school decision options — fixed order for all UI surfaces. */
export const ADMISSION_DECISION_OPTIONS = [
  'accepted',
  'accepted_with_condition',
  'waitlisted',
  'needs_reassessment',
  'rejected',
] as const satisfies readonly DecisionType[];

export type AdmissionDecisionOption = (typeof ADMISSION_DECISION_OPTIONS)[number];

export function getAdmissionDecisionOptions(): readonly AdmissionDecisionOption[] {
  return ADMISSION_DECISION_OPTIONS;
}

export function isAdmissionDecisionOption(value: string | null | undefined): value is AdmissionDecisionOption {
  return ADMISSION_DECISION_OPTIONS.includes(String(value ?? '') as AdmissionDecisionOption);
}

export function admissionDecisionLabelKey(decision: AdmissionDecisionOption): string {
  if (decision === 'rejected') return 'admin.admissions.schoolDecision.rejected';
  return `admin.admissions.decisions.${decision}`;
}

export function decisionRequiresConditions(decision: string | null | undefined): boolean {
  return decision === 'accepted_with_condition';
}

export function decisionRequiresRejectionReason(decision: string | null | undefined): boolean {
  return decision === 'rejected';
}
