export type ArrearsFollowupTab =
  | 'all'
  | 'needs_followup'
  | 'payment_promises'
  | 'today_followup'
  | 'escalated'
  | 'resolved'
  | 'pending_cheque';

export type ArrearsFollowupStatus =
  | 'open'
  | 'needs_followup'
  | 'payment_promise'
  | 'escalated'
  | 'resolved'
  | string;

export type ArrearsFollowupListItem = {
  family_id: number;
  billing_partner_id?: number;
  account_kind?: 'family' | 'individual' | null;
  family_name?: string;
  guardian_name?: string;
  display_name?: string;
  student_count?: number;
  total_overdue?: number;
  gross_overdue_amount?: number;
  pending_cheque_coverage_amount?: number;
  actionable_overdue_amount?: number;
  pending_cheque_amount?: number;
  total_remaining?: number;
  oldest_overdue_date?: string | null;
  followup_status?: ArrearsFollowupStatus | null;
  followup_status_label?: string | null;
  payment_promise_date?: string | null;
  payment_promise_amount?: number | null;
  next_followup_date?: string | null;
  assigned_user_id?: number | null;
  assigned_user_name?: string | null;
  currency?: unknown;
  guardians?: ArrearsGuardianDetail[];
  students?: ArrearsStudentDetail[];
  overdue_installments?: ArrearsOverdueInstallmentDetail[];
};

export type ArrearsFollowupSummary = {
  overdue_accounts_count?: number;
  overdue_families_count?: number;
  total_overdue_amount?: number;
  actionable_overdue_accounts_count?: number;
  total_actionable_overdue_amount?: number;
  total_pending_cheque_coverage_on_overdue?: number;
  payment_promises_count?: number;
  today_followups_count?: number;
};

export type ArrearsFollowupLastEntry = {
  id?: number;
  date?: string | null;
  occurred_at?: string | null;
  contact_method?: string | null;
  contact_method_label?: string | null;
  contact_result?: string | null;
  contact_result_label?: string | null;
  contact_notes?: string | null;
  notes?: string | null;
  followup_type?: string | null;
  followup_type_label?: string | null;
  promise_date?: string | null;
  promise_amount?: number | null;
  next_followup_date?: string | null;
  user_name?: string | null;
};

export type ArrearsGuardianRelationshipContext = {
  student_id: number;
  relationship_type?: string | null;
  is_primary_contact?: boolean;
  is_financial_responsible?: boolean;
  is_legal_guardian?: boolean;
};

export type ArrearsGuardianDetail = {
  guardian_id: number;
  partner_id?: number | null;
  name?: string;
  phone?: string | null;
  is_billing_partner?: boolean;
  relationship_contexts: ArrearsGuardianRelationshipContext[];
};

export type ArrearsStudentDetail = {
  student_id: number;
  student_name?: string;
  student_code?: string | null;
  class?: unknown;
  level?: unknown;
  gross_overdue_amount?: number;
  pending_cheque_coverage_amount?: number;
  actionable_overdue_amount?: number;
};

export type ArrearsOverdueInstallmentDetail = {
  installment_id: number;
  student_id: number;
  student_name?: string;
  student_code?: string | null;
  fee_id?: number | null;
  fee_type_id?: number | null;
  fee_type_name?: string | null;
  period_key?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  due_date?: string | null;
  gross_overdue_amount?: number;
  pending_cheque_coverage_amount?: number;
  actionable_overdue_amount?: number;
};

export type ArrearsFamilyFollowupDetail = {
  family_id: number;
  billing_partner_id?: number;
  account_kind?: 'family' | 'individual' | null;
  family_name?: string;
  guardian_name?: string;
  display_name?: string;
  student_count?: number;
  total_overdue?: number;
  gross_overdue_amount?: number;
  pending_cheque_coverage_amount?: number;
  actionable_overdue_amount?: number;
  total_remaining?: number;
  currency?: unknown;
  followup_status?: ArrearsFollowupStatus | null;
  followup_status_label?: string | null;
  payment_promise_date?: string | null;
  payment_promise_amount?: number | null;
  next_followup_date?: string | null;
  last_followup?: ArrearsFollowupLastEntry | null;
  open_followup_id?: number | null;
  can_resolve?: boolean;
  guardians?: ArrearsGuardianDetail[];
  students?: ArrearsStudentDetail[];
  overdue_installments?: ArrearsOverdueInstallmentDetail[];
};

export type ArrearsFollowupContactPayload = {
  family_id: number;
  followup_type: 'contact';
  contact_method: string;
  contact_result: string;
  contact_notes?: string;
  next_followup_date?: string;
};

export type ArrearsFollowupPromisePayload = {
  family_id: number;
  followup_type: 'payment_promise';
  promise_date: string;
  promise_amount: number;
  next_followup_date?: string;
  contact_notes?: string;
};

export type ArrearsFollowupResolvePayload = {
  family_id: number;
  followup_type: 'resolve';
  contact_notes?: string;
};

export type ArrearsFollowupCreatePayload =
  | ArrearsFollowupContactPayload
  | ArrearsFollowupPromisePayload
  | ArrearsFollowupResolvePayload;

export type ArrearsFollowupListResult = {
  items: ArrearsFollowupListItem[];
  summary: ArrearsFollowupSummary | null;
  appliedTab: ArrearsFollowupTab | null;
};

export type ArrearsMergedRow = ArrearsFollowupListItem & {
  billing_partner_id: number;
};