export type StudentDepartureType = 'withdrawn' | 'transferred';

export type StudentDepartureFinancialPolicy =
  | 'FULL_CURRENT_PERIOD'
  | 'PRORATE_TO_DEPARTURE_DATE'
  | 'KEEP_CURRENT_STATE_STOP_NEXT_PERIOD';

export interface StudentDepartureDecisionPayload {
  departure_type: StudentDepartureType;
  last_day: string;
  reason: string;
  note?: string | null;
  destination_school?: string | null;
  financial_policy?: StudentDepartureFinancialPolicy | null;
}

export interface StudentDepartureMessage {
  code: string;
  message: string;
  [key: string]: unknown;
}

export interface StudentDeparturePolicyDetail {
  available?: boolean;
  blocking_reasons?: StudentDepartureMessage[];
  projected_impact?: {
    current_period_change?: string | null;
    future_stop?: boolean;
    future_open_count?: number;
    future_locked_retained?: number;
    [key: string]: unknown;
  } | null;
  proration?: Array<Record<string, unknown>>;
}

export interface StudentDepartureInstallmentImpact {
  id: number;
  period_key?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  amount?: number | null;
  paid_amount?: number | null;
  state?: string | null;
  lock_reasons?: string[];
}

export interface StudentDeparturePreview {
  preview_only: true;
  can_confirm: boolean;
  student: {
    id: number;
    name?: string | null;
    code?: string | null;
    state?: string | null;
    active?: boolean;
    current_class_id?: number | null;
  };
  enrollment: {
    id: number | null;
    state: string | null;
    class_id: number | null;
    academic_year_id: number | null;
    date_start: string | null;
  } | null;
  decision: StudentDepartureDecisionPayload & { student_id: number };
  academic_impact: {
    enrollment_id: number | null;
    enrollment_state_after: StudentDepartureType;
    date_end: string;
    class_id_preserved: number | null;
    student_state_after: StudentDepartureType;
    student_active_remains: boolean;
  };
  class_impact: {
    historical_class_id: number | null;
    clear_current_class_id: boolean;
    current_class_id_before: number | null;
  };
  service_impact: {
    recurring_to_end?: Array<Record<string, unknown>>;
    preserve?: Array<Record<string, unknown>>;
    already_closed?: Array<Record<string, unknown>>;
    unsafe?: Array<Record<string, unknown>>;
  };
  finance_impact: {
    has_agreement?: boolean;
    current_agreement?: {
      id: number;
      state?: string | null;
      academic_year_id?: number | null;
      currency?: string | null;
    } | null;
    current_period_amount?: number | null;
    confirmed_paid_allocated_amount?: number | null;
    remaining?: number | null;
    future_installments?: StudentDepartureInstallmentImpact[];
    locked_future_installments?: StudentDepartureInstallmentImpact[];
    credit_balance?: number | null;
    current_period_installments?: StudentDepartureInstallmentImpact[];
    period_amendable_line_ids?: number[];
    selected_policy?: StudentDepartureFinancialPolicy | null;
    policy_details?: Partial<Record<StudentDepartureFinancialPolicy, StudentDeparturePolicyDetail>>;
    projected_impact?: StudentDeparturePolicyDetail['projected_impact'];
  };
  allowed_financial_policies: StudentDepartureFinancialPolicy[];
  warnings: StudentDepartureMessage[];
  blocking_reasons: StudentDepartureMessage[];
  preview_fingerprint: string;
  preview_token: string;
}

export interface StudentDepartureConfirmPayload extends StudentDepartureDecisionPayload {
  preview_fingerprint: string;
  idempotency_key: string;
}

export interface StudentDepartureConfirmResult {
  idempotent_replay: boolean;
  already_departed?: boolean;
  student_id: number;
  student_state: StudentDepartureType | string;
  student_active?: boolean;
  enrollment_id: number;
  enrollment_state: StudentDepartureType | string;
  date_end: string | null;
  class_id_preserved?: number | null;
  current_class_id?: number | null;
  current_class_cleared?: boolean;
  financial_policy?: StudentDepartureFinancialPolicy | null;
  finance?: {
    amendment_ids?: Array<number | null>;
    primary_amendment_id?: number | null;
    proration?: Array<Record<string, unknown>>;
    warnings?: StudentDepartureMessage[];
  };
  services_ended_ids?: number[];
  warnings?: StudentDepartureMessage[];
  preview_fingerprint?: string;
  departure_confirmed_at?: string | null;
  departure_confirmed_by?: number;
}
