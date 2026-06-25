import type { StudentFinanceCurrency } from '@/types/student-finance';
import type { FeePlanCandidatePlan } from '@/types/student-enrollment-finance';

/** Activation mode used when assigning a plan to an existing student. */
export type AssignPlanActivationMode = 'draft' | 'activate';

/** Body sent to POST /admin/students/{id}/finance/plan-preview. */
export interface StudentFinancePlanPreviewBody {
  /** Optional — only sent when available from context or after picking a candidate. */
  academic_year_id?: number;
  /** Optional — only sent after the user picks a non-default candidate plan. */
  fee_plan_id?: number;
}

/** Body sent to POST /admin/students/{id}/finance/assign-plan. */
export interface StudentFinanceAssignPlanBody {
  fee_plan_id: number;
  academic_year_id?: number;
  activation_mode: AssignPlanActivationMode;
  customize_plan: boolean;
  discounts: never[];
  selected_optional_line_ids: never[];
}

/** Normalized, UI-friendly view of a successful plan preview. */
export interface AssignPlanPreview {
  feePlanId: number | null;
  planName: string | null;
  academicYearId: number | null;
  academicYearName: string | null;
  levelName: string | null;
  total: number | null;
  currency: StudentFinanceCurrency | null;
  installmentCount: number | null;
  /** Enabled allowed-action keys (display only). */
  allowedActions: string[];
  canAssign: boolean;
}

/**
 * Classification of a preview response into a single UI state. Keeps the
 * component declarative and the contract handling testable in isolation.
 */
export type AssignPlanPreviewState =
  | { kind: 'ready'; plan: AssignPlanPreview }
  | { kind: 'active_agreement_exists' }
  | { kind: 'missing_academic_enrollment' }
  | { kind: 'no_eligible_plan' }
  | { kind: 'candidate_selection'; candidates: FeePlanCandidatePlan[]; message?: string }
  | { kind: 'error'; message?: string };
