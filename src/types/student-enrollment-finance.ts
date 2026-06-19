import type { Ref } from '@/types/api';
import type { StudentFinanceCurrency } from '@/types/student-finance';

export type FeePlanCustomizationReason =
  | 'late_enrollment'
  | 'scholarship'
  | 'special_discount'
  | 'family_agreement'
  | 'expected_withdrawal'
  | 'manual_adjustment'
  | 'other';

export type StudentCreateBillingPartnerType = 'guardian' | 'student' | 'other';

export interface FeePlanSuggestQuery {
  school_id: number;
  academic_year_id: number;
  level_id: number;
  enrollment_date: string;
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
  notes?: boolean;
}

export interface FeePlanSuggestResult {
  ok: true;
  fee_plan_id: number;
  fee_plan_name: string;
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
}

export type FeePlanSuggestErrorCode = 'no_default_fee_plan_for_level' | string;

export interface StudentCreateFinancePeriodPayload {
  period_key: string;
  selected: boolean;
  amount_override?: number | null;
  due_date_override?: string | null;
}

export interface StudentCreateFinancePayload {
  fee_plan_id: number;
  customize_plan: boolean;
  customization_reason?: FeePlanCustomizationReason;
  customization_notes?: string;
  periods?: StudentCreateFinancePeriodPayload[];
}

export interface StudentCreateFinanceFormState {
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
}

export interface StudentCreateBillingFormState {
  billingPartnerType: StudentCreateBillingPartnerType;
}
