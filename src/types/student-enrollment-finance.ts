import type { Ref } from '@/types/api';
import type { RelationshipType } from '@/types/student-360';
import type { StudentFinanceCurrency } from '@/types/student-finance';

export type FeePlanCustomizationReason =
  | 'late_enrollment'
  | 'scholarship'
  | 'special_discount'
  | 'family_agreement'
  | 'expected_withdrawal'
  | 'manual_adjustment'
  | 'other';

/** @deprecated UI-only legacy label; use responsibilitySelection for create payload. */
export type StudentCreateBillingPartnerType = 'guardian' | 'student' | 'other';

export type StudentCreateBillingResponsibilitySelection = 'needs_selection' | 'guardian' | 'student';

export type EnrollmentDiscountScope = 'plan' | 'line' | 'period';
export type EnrollmentDiscountType = 'percent' | 'fixed_amount';

export interface FeePlanSuggestQuery {
  school_id: number;
  academic_year_id: number;
  level_id: number;
  enrollment_date: string;
  fee_plan_id?: number;
}

export interface FeePlanSuggestedPeriod {
  period_key: string;
  label: string;
  due_date: string;
  amount?: number | null;
  selected?: boolean;
  allow_amount_override?: boolean;
  allow_due_date_override?: boolean;
}

export interface FeePlanExcludedPeriod {
  period_key: string;
  label: string;
}

export interface FeePlanSuggestAllowedActions {
  skip_finance?: boolean;
  customize_amounts?: boolean;
  customize_due_dates?: boolean;
  customize_periods?: boolean;
  customize_plan?: boolean;
  select_other_plan?: boolean;
  notes?: boolean;
}

export interface EligibleFeePlan {
  id: number;
  name: string;
  is_default_for_level?: boolean;
  is_selected?: boolean;
  summary?: {
    expected_total?: number | null;
    monthly_due_total?: number | null;
    one_time_total?: number | null;
  };
}

export interface EnrollmentPlanLine {
  line_id: number;
  fee_type_id?: number | null;
  fee_type_name: string;
  frequency?: string | null;
  base_amount?: number | null;
  amount?: number | null;
  currency?: string | null;
  installment_count?: number | null;
  installment_amount?: number | null;
  total_amount?: number | null;
  monthly_installment_amount?: number | null;
  is_mandatory?: boolean;
  is_monthly?: boolean;
  is_one_time?: boolean;
  is_optional?: boolean;
  pricing_mode?: 'recurring_unit_price' | 'total_amount_installments' | string | null;
  due_date?: string | null;
  original_total?: number | null;
  suggested_total?: number | null;
}

export interface EnrollmentFinancialSummary {
  currency?: string | StudentFinanceCurrency | null;
  one_time_total?: number | null;
  original_monthly_total?: number | null;
  suggested_monthly_total?: number | null;
  plan_monthly_total?: number | null;
  monthly_total?: number | null;
  monthly_due_total?: number | null;
  monthly_installment_amount?: number | null;
  original_monthly_installments_count?: number | null;
  suggested_monthly_installments_count?: number | null;
  monthly_installments_count?: number | null;
  expected_total?: number | null;
  recurring_periodic_total?: number | null;
}

export interface EnrollmentCustomizationOneTimeLine {
  line_id: number;
  selected?: boolean;
  amount_override?: number | null;
  due_date_override?: string | null;
}

export interface EnrollmentCustomizationContract {
  periods_apply_to?: string | null;
  one_time_lines?: EnrollmentCustomizationOneTimeLine[];
  supports_plan_discount?: boolean;
  supports_line_discount?: boolean;
  supports_period_discount?: boolean;
  discount_types?: EnrollmentDiscountType[];
  discount_scopes?: EnrollmentDiscountScope[];
  requires_reason?: boolean;
}

export interface EnrollmentPlanPreviewLine {
  line_id: number;
  fee_type_name?: string;
  base_amount?: number | null;
  final_installment_amount?: number | null;
  final_total?: number | null;
  discount_percent?: number | null;
}

export interface EnrollmentPlanPreviewResult {
  original_total?: number | null;
  discount_total?: number | null;
  final_total?: number | null;
  monthly_due_total?: number | null;
  one_time_total?: number | null;
  lines?: EnrollmentPlanPreviewLine[];
}

export interface FeePlanSuggestResult {
  ok: true;
  fee_plan_id: number;
  fee_plan_name: string;
  is_default_for_level?: boolean;
  academic_year?: Ref | null;
  level?: Ref | null;
  season_name?: string | null;
  performance_start?: string | null;
  performance_end?: string | null;
  due_day?: number | null;
  suggested_period_count?: number | null;
  suggested_periods: FeePlanSuggestedPeriod[];
  excluded_periods: FeePlanExcludedPeriod[];
  total_due?: number | null;
  currency?: StudentFinanceCurrency | null;
  allowed_actions?: FeePlanSuggestAllowedActions;
  eligible_plans?: EligibleFeePlan[];
  plan_lines?: EnrollmentPlanLine[];
  financial_summary?: EnrollmentFinancialSummary | null;
  customization_contract?: EnrollmentCustomizationContract | null;
  preview?: EnrollmentPlanPreviewResult | null;
}

export type FeePlanSuggestErrorCode =
  | 'no_default_fee_plan_for_level'
  | 'no_eligible_fee_plan_for_level'
  | string;

export interface FeePlanCandidatePlan {
  id: number;
  name: string;
  reason_not_selected?: string;
  /** Backend explicit flag (new contract). When absent, derived from reason. */
  selectable?: boolean;
  /** Backend action hint, e.g. 'select_manually'. */
  allowed_action?: string;
  /** Human-readable hint for why/how this plan can be used. */
  hint?: string;
  is_default_for_level?: boolean;
  academic_year?: Ref | null;
  academic_year_name?: string | null;
  currency?: string | null;
  total?: number | null;
  expected_total?: number | null;
  monthly_due_total?: number | null;
  one_time_total?: number | null;
  level_ids?: number[];
  level_names?: string[];
  scope_summary?: string | null;
}

export interface FeePlanSuggestError {
  code: string;
  message?: string;
  diagnostics?: {
    matching_level_plans?: number;
    plans_not_default?: number;
    plans_without_academic_year?: number;
    plans_wrong_year?: number;
    plans_wrong_school?: number;
    plans_inactive?: number;
  };
  candidate_plans?: FeePlanCandidatePlan[];
  /** New contract: candidates the user may select manually. */
  selectable_candidate_plans?: FeePlanCandidatePlan[];
  /** New contract: true when a matching plan exists but needs manual choice. */
  requires_manual_selection?: boolean;
}

export interface StudentCreateFinancePeriodPayload {
  period_key: string;
  selected: boolean;
  amount_override?: number | null;
  due_date_override?: string | null;
}

export interface StudentCreateFinanceDiscountPayload {
  scope: EnrollmentDiscountScope;
  type: EnrollmentDiscountType;
  value: number;
  reason: string;
  line_id?: number;
  period_key?: string;
}

export interface StudentCreateFinanceOneTimeLinePayload {
  line_id: number;
  selected: boolean;
  amount_override?: number | null;
  due_date_override?: string | null;
}

export type FinanceAgreementActivationMode = 'draft' | 'activate';

export interface StudentCreateFinancePayload {
  fee_plan_id: number;
  customize_plan: boolean;
  activation_mode?: FinanceAgreementActivationMode;
  customization_reason?: FeePlanCustomizationReason;
  customization_notes?: string;
  periods?: StudentCreateFinancePeriodPayload[];
  discounts?: StudentCreateFinanceDiscountPayload[];
  one_time_lines?: StudentCreateFinanceOneTimeLinePayload[];
}

export interface EnrollmentFinanceDiscountFormState {
  enabled: boolean;
  type: EnrollmentDiscountType | '';
  value: string;
  reason: FeePlanCustomizationReason | '';
}

export interface EnrollmentFinanceOneTimeLineFormState {
  selected: boolean;
  amountOverride: string;
  dueDateOverride: string;
}

export interface StudentCreateFinanceFormState {
  selectedFeePlanId: number | null;
  customizePlan: boolean;
  customizationReason: FeePlanCustomizationReason | '';
  customizationNotes: string;
  periodOverrides: Record<
    string,
    {
      selected: boolean;
      amountOverride: string;
      dueDateOverride: string;
    }
  >;
  planDiscount: EnrollmentFinanceDiscountFormState;
  lineDiscounts: Record<string, EnrollmentFinanceDiscountFormState>;
  oneTimeLines: Record<string, EnrollmentFinanceOneTimeLineFormState>;
}

export type StudentCreateGuardianSourceMode = 'new' | 'existing';

export interface StudentCreateExistingGuardianEntry {
  kind: 'existing';
  entryKey: string;
  /** Canonical school.parent id — never partner_id */
  guardian_id: number;
  displayName: string;
  relationship_type: RelationshipType;
  is_primary_contact: boolean;
  phone?: string;
  email?: string;
}

export interface StudentCreateNewGuardianEntry {
  kind: 'new';
  entryKey: string;
  full_name: string;
  phone?: string;
  email?: string;
  relationship_type: RelationshipType;
  is_primary_contact: boolean;
}

export type StudentCreateGuardianEntry =
  | StudentCreateExistingGuardianEntry
  | StudentCreateNewGuardianEntry;

export interface StudentCreateBillingFormState {
  responsibilitySelection: StudentCreateBillingResponsibilitySelection;
  studentBillingConfirmed: boolean;
  studentBillingReason: string;
  guardianSourceMode: StudentCreateGuardianSourceMode;
  /** Canonical school.parent id selected from search — not partner_id */
  linkedGuardianId: number | null;
  /** Required when more than one guardian entry is submitted */
  billingGuardianEntryKey: string | null;
  /** Additional guardians beyond the primary wizard slot */
  guardianEntries: StudentCreateGuardianEntry[];
  /** Per additional entryKey: new vs existing search UI before the entry is complete */
  additionalGuardianSourceModeByEntryKey: Record<string, StudentCreateGuardianSourceMode>;
  /** Opt-in portal provisioning per guardian entryKey — omitted/false means no request */
  provisionAccessByEntryKey: Record<string, boolean>;
}

export interface EnrollmentPlanPreviewQuery {
  school_id: number;
  academic_year_id: number;
  level_id: number;
  enrollment_date: string;
  finance: StudentCreateFinancePayload;
}
