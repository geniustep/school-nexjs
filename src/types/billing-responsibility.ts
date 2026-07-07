/** Canonical billing responsibility request sent on student create. */
export type BillingResponsibilityRequest =
  | {
      mode: 'guardian';
      /** school.parent id — only when billing guardian is an existing linked guardian */
      billing_guardian_id?: number;
    }
  | {
      mode: 'student';
      confirmed: true;
      reason: string;
    };

export type BillingResponsibilityMode = BillingResponsibilityRequest['mode'];

export type BillingResponsibilityStatus =
  | 'resolved'
  | 'unresolved'
  | 'needs_selection'
  | 'legacy_unknown';

export interface BillingResponsibilityMetadata {
  mode?: BillingResponsibilityMode;
  status?: BillingResponsibilityStatus;
  source?: string;
  billing_partner_id?: number | null;
  requires_selection?: boolean;
  requires_student_confirmation?: boolean;
  review_required?: boolean;
  warning_codes?: string[];
  data_quality_flags?: string[];
}

export interface BillingResponsibilityOutcome {
  metadata: BillingResponsibilityMetadata | null;
  collectionAllowed: boolean | null;
}

export const BILLING_RESPONSIBILITY_STABLE_ERROR_CODES = [
  'billing_responsibility_contract_conflict',
  'billing_responsibility_required',
  'student_billing_confirmation_required',
  'student_billing_reason_required',
  'student_billing_scope_mismatch',
  'billing_responsibility_unresolved',
  'billing_responsibility_existing_agreement_conflict',
  'invalid_billing_responsibility',
  'invalid_billing_responsibility_mode',
  'billing_guardian_required',
  'billing_guardian_ambiguous',
  'billing_guardian_not_linked',
  'billing_guardian_relationship_inactive',
] as const;

export const STUDENT_CREATE_GUARDIAN_ATOMIC_ERROR_CODES = [
  'guardian_identity_candidate_exists',
] as const;

export type StudentCreateGuardianAtomicErrorCode =
  (typeof STUDENT_CREATE_GUARDIAN_ATOMIC_ERROR_CODES)[number];

export type BillingResponsibilityStableErrorCode =
  (typeof BILLING_RESPONSIBILITY_STABLE_ERROR_CODES)[number];
