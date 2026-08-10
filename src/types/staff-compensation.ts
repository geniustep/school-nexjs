export type CompensationMethod =
  | 'monthly_fixed'
  | 'daily'
  | 'hourly'
  | 'per_session'
  | 'mixed'
  | 'stipend'
  | 'unpaid_internship';

export type CompensationPeriodState =
  | 'draft'
  | 'calculated'
  | 'under_review'
  | 'approved'
  | 'cancelled';

export type CompensationAgreement = {
  id: number;
  name?: string | null;
  agreement_id?: number | null;
  school_id?: number | null;
  staff_user_id?: number | null;
  teacher_id?: number | null;
  compensation_method: CompensationMethod;
  method?: CompensationMethod;
  currency?: string | null;
  currency_id?: number | null;
  effective_from: string;
  effective_to?: string | null;
  state?: string | null;
  is_base?: boolean;
  staff_role_type?: string | null;
  professional_code?: string | null;
  fixed_monthly_amount?: number | null;
  daily_rate?: number | null;
  hourly_rate?: number | null;
  session_rate?: number | null;
  fixed_amount?: number | null;
  variable_method?: 'daily' | 'hourly' | 'per_session' | null;
  variable_rate?: number | null;
  stipend_amount?: number | null;
  stipend_period?: 'monthly' | 'period' | 'one_time' | null;
  terms_note?: string | null;
  contract_reference?: string | null;
};

export type CompensationCalculation = {
  base_amount?: number;
  variable_amount?: number;
  allowances_amount?: number;
  bonuses_amount?: number;
  deductions_amount?: number;
  gross_amount?: number;
  net_amount?: number;
};

export type CompensationLine = {
  id: number;
  unit_type?: string | null;
  quantity?: number | null;
  rate?: number | null;
  amount?: number | null;
  source_type?: string | null;
  source_model?: string | null;
  source_id?: number | null;
  description?: string | null;
  provisional?: boolean;
  approved?: boolean;
  evidence_state?: string | null;
};

export type CompensationPeriod = {
  id: number;
  name?: string | null;
  school_id?: number | null;
  staff_user_id?: number | null;
  teacher_id?: number | null;
  agreement_id: number;
  period_start: string;
  period_end: string;
  state: CompensationPeriodState;
  payment_status?: 'not_integrated' | 'pending_finance' | string;
  currency?: string | null;
  currency_id?: number | null;
  calculation?: CompensationCalculation;
  agreement_snapshot?: Partial<CompensationAgreement> & { method?: CompensationMethod };
  lines?: CompensationLine[];
  calculation_locked?: boolean;
  approval?: Record<string, unknown>;
};

export type StaffCompensationSummary = {
  contract?: {
    name?: string;
    version?: string;
    staff_first?: boolean;
    payment_boundary?: string;
  };
  staff: {
    id: number;
    name: string;
    teacher_id?: number | null;
    professional_code?: string | null;
    role_type?: string | null;
  };
  current_agreement?: CompensationAgreement | null;
  agreement_history_summary?: Array<Partial<CompensationAgreement> & { id: number }>;
  current_period?: CompensationPeriod | null;
  recent_periods?: CompensationPeriod[];
  warnings?: Array<{ code?: string; message?: string }>;
  allowed_actions?: string[];
  payment_status?: string | null;
};

export type CompensationAgreementWrite = {
  compensation_method: CompensationMethod;
  effective_from: string;
  effective_to?: string | null;
  currency?: string;
  state?: string;
  is_base?: boolean;
  staff_role_type?: string;
  fixed_monthly_amount?: number;
  daily_rate?: number;
  hourly_rate?: number;
  session_rate?: number;
  fixed_amount?: number;
  variable_method?: 'daily' | 'hourly' | 'per_session';
  variable_rate?: number;
  stipend_amount?: number;
  stipend_period?: 'monthly' | 'period' | 'one_time';
  terms_note?: string;
  contract_reference?: string;
  link_teacher?: boolean;
};
