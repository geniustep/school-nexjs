/**
 * Types for the Student Finance "Repair Center" (معالجة الملف المالي).
 *
 * Backed by the documented Odoo contract:
 *   GET  /api/v1/admin/students/<id>/finance/repair-diagnostics
 *   POST /api/v1/admin/students/<id>/finance/repair-actions/<action_code>/preview
 *   POST /api/v1/admin/students/<id>/finance/repair-actions/<action_code>/apply
 */

/** Canonical, UI-facing health of the student financial file. */
export type FinanceFileHealth = 'healthy' | 'needs_review' | 'blocked' | 'unknown';

/** Severity of a detected anomaly. */
export type FinanceRepairSeverity = 'info' | 'warning' | 'blocking';

/** A reason (warning or blocker) returned by the backend. */
export interface FinanceRepairReason {
  code: string;
  message: string | null;
}

/** A single detected problem in the financial file. */
export interface FinanceRepairAnomaly {
  code: string;
  title: string | null;
  description: string | null;
  severity: FinanceRepairSeverity;
  impacts: string[];
  impactAmount: number | null;
}

/** A fee plan the admin may pick before preview/apply. */
export interface FinanceRepairCandidatePlan {
  id: number;
  name: string;
  feeCount: number | null;
  totalAmount: number | null;
  installmentCount: number | null;
  paidAmount: number | null;
  hasPayments: boolean;
  removable: boolean;
}

/**
 * How a selected plan id maps to the preview/apply request body.
 * - keep: send { keep_plan_id }
 * - cancel: send { target_plan_id } (plan to remove)
 * - none: no plan selection required
 */
export type FinanceRepairPlanSelectionMode = 'keep' | 'cancel' | 'none';

/** A suggested repair action the admin can preview/apply. */
export interface FinanceRepairAction {
  code: string;
  label: string | null;
  description: string | null;
  canApply: boolean;
  requiresReason: boolean;
  requiresConfirmation: boolean;
  blockingReasons: FinanceRepairReason[];
  isBlocked: boolean;
  candidatePlans: FinanceRepairCandidatePlan[];
  planSelectionMode: FinanceRepairPlanSelectionMode;
}

export interface NormalizedFinanceRepairDiagnostics {
  available: boolean;
  health: FinanceFileHealth;
  canApplyActions: boolean;
  anomalies: FinanceRepairAnomaly[];
  actions: FinanceRepairAction[];
  blockingReasons: FinanceRepairReason[];
  hasAnomalies: boolean;
}

/** "Before" snapshot for a repair preview. */
export interface FinanceRepairBeforeSnapshot {
  feeCount: number | null;
  totalAmount: number | null;
  installmentCount: number | null;
  planNames: string[];
}

/** "After" outcome for a repair preview. */
export interface FinanceRepairAfterOutcome {
  keptPlanName: string | null;
  cancelledPlanName: string | null;
  affectedFeeCount: number | null;
  affectedInstallmentCount: number | null;
  totalAmount: number | null;
  planNames: string[];
}

export interface NormalizedFinanceRepairPreview {
  allowed: boolean;
  summary: string | null;
  before: FinanceRepairBeforeSnapshot;
  after: FinanceRepairAfterOutcome;
  cancelledFeeCount: number | null;
  cancelledInstallmentCount: number | null;
  warnings: FinanceRepairReason[];
  blockingReasons: FinanceRepairReason[];
  requiresReason: boolean;
  requiresConfirmation: boolean;
  confirmationLabel: string | null;
  currency: string | null;
  followUpActionCode: string | null;
}

/** Body sent to preview/apply. */
export interface FinanceRepairActionPayload {
  reason?: string;
  confirmed?: boolean;
  keep_plan_id?: number;
  target_plan_id?: number;
  [key: string]: unknown;
}

export interface FinanceRepairApplyResponse {
  success?: boolean;
  message?: string;
  diagnostics?: unknown;
  finance_workspace?: unknown;
  [key: string]: unknown;
}

/** Raw API shapes (permissive). */
export interface FinanceRepairRecommendedActionRaw {
  action_code?: string;
  code?: string;
  title?: string;
  label?: string;
  description?: string;
  requires_reason?: boolean;
  requires_confirmation?: boolean;
  can_apply?: boolean;
  blocking_reasons?: unknown;
  candidate_plans?: FinanceRepairCandidatePlanRaw[];
}

export interface FinanceRepairCandidatePlanRaw {
  fee_plan_id?: number;
  id?: number;
  fee_plan_name?: string;
  name?: string;
  fees_count?: number;
  total_amount?: number;
  installments_count?: number;
  schedule_count?: number;
  paid_amount?: number;
  has_payments?: boolean;
  removable?: boolean;
}

export interface FinanceRepairDiagnosticsRaw {
  overall_status?: string;
  file_status?: string;
  status?: string;
  anomalies?: unknown[];
  recommended_actions?: FinanceRepairRecommendedActionRaw[];
  suggested_actions?: FinanceRepairRecommendedActionRaw[];
  actions?: FinanceRepairRecommendedActionRaw[];
  blocking_reasons?: unknown;
  can_apply_actions?: boolean;
}

export const REGULARIZE_AFTER_CLEANUP_ACTION = 'regularize_agreement_after_cleanup';
export const KEEP_FEE_PLAN_ACTION = 'keep_fee_plan_and_cancel_overlapping_plan';
export const REMOVE_DUPLICATE_PLAN_ACTION = 'remove_unpaid_duplicate_fee_plan_assignment';
