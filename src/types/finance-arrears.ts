export type ArrearsFollowupTab =
  | 'all'
  | 'needs_followup'
  | 'payment_promises'
  | 'today_followup'
  | 'escalated'
  | 'resolved';

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
  family_name?: string;
  guardian_name?: string;
  display_name?: string;
  student_count?: number;
  total_overdue?: number;
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
};

export type ArrearsFollowupSummary = {
  overdue_families_count?: number;
  total_overdue_amount?: number;
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

export type ArrearsFamilyFollowupDetail = {
  family_id: number;
  family_name?: string;
  guardian_name?: string;
  display_name?: string;
  student_count?: number;
  total_overdue?: number;
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
