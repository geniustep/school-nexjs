import type { Pagination, Ref, SchoolRef } from './api';
import type { PaymentCollection, PaymentJournal } from './finance';

export type CashSessionState = 'open' | 'closing' | 'closed' | 'reopened' | string;

export type CashSessionAction =
  | 'view'
  | 'add_cash_collection'
  | 'start_closing'
  | 'close'
  | 'approve_difference'
  | 'reopen'
  | 'add_movement'
  | 'print_closure'
  | string;

export type CashMovementType =
  | 'cash_in_adjustment'
  | 'cash_out_adjustment'
  | 'bank_deposit'
  | 'safe_transfer_out'
  | 'safe_transfer_in'
  | string;

export interface CashSessionSummary {
  opening_balance?: number;
  cash_collections_total?: number;
  movements_in_total?: number;
  movements_out_total?: number;
  expected_balance?: number;
  collections_count?: number;
  receipts_count?: number;
  total_cash_in?: number;
  total_cash_out?: number;
}

export interface CashSessionMovement {
  id: number;
  type?: CashMovementType | string;
  type_label?: string;
  amount?: number;
  direction?: 'in' | 'out' | string;
  reason?: string;
  reference?: string;
  note?: string;
  created_at?: string;
  created_by?: Ref;
  state?: string;
}

export interface CashSessionCollectionRow {
  id: number;
  number?: string;
  reference?: string;
  receipt_id?: number;
  receipt_number?: string;
  date?: string;
  collection_date?: string;
  payer_name?: string;
  student_name?: string;
  student?: Ref & { full_name?: string };
  payer?: Ref;
  amount?: number;
  payment_method?: string;
  state?: string;
  status?: string;
}

export interface CashSessionReceiptRow {
  id: number;
  number?: string;
  receipt_number?: string;
  date?: string;
  amount?: number;
  collection_id?: number;
  state?: string;
}

export interface CashSessionAuditEvent {
  id?: string | number;
  at?: string;
  date?: string;
  action?: string;
  label?: string;
  user?: Ref | string;
  note?: string;
  reason?: string;
  state_before?: string;
  state_after?: string;
}

export interface CashSession {
  id: number;
  number?: string;
  name?: string;
  state?: CashSessionState;
  state_label?: string;
  journal_id?: number;
  journal?: PaymentJournal | Ref;
  cashier?: Ref;
  cashier_name?: string;
  school?: SchoolRef | Ref;
  school_id?: number;
  currency?: string | { id?: number; name?: string; symbol?: string };
  currency_code?: string;
  opening_balance?: number;
  expected_balance?: number;
  counted_balance?: number;
  difference?: number;
  difference_reason?: string;
  closing_note?: string;
  opened_at?: string;
  open_date?: string;
  closed_at?: string;
  close_date?: string;
  closed_by?: Ref;
  reopen_count?: number;
  summary?: CashSessionSummary;
  collections?: CashSessionCollectionRow[];
  receipts?: CashSessionReceiptRow[];
  movements?: CashSessionMovement[];
  timeline?: CashSessionAuditEvent[];
  audit_events?: CashSessionAuditEvent[];
  allowed_actions?: CashSessionAction[];
}

export interface CashSessionCurrentResponse {
  session: CashSession | null;
}

export interface CashSessionListResult {
  items: CashSession[];
  pagination: Pagination | null;
}

export interface OpenCashSessionPayload {
  journal_id: number;
  opening_balance: number;
  note?: string;
}

export interface CloseCashSessionPayload {
  counted_balance: number;
  difference_reason?: string;
  closing_note?: string;
}

export interface ReopenCashSessionPayload {
  reason: string;
}

export interface AddCashMovementPayload {
  movement_type: CashMovementType | string;
  amount: number;
  reason: string;
  reference?: string;
  note?: string;
}

export interface CashSessionLegacyDryRun {
  classification?: string;
  enforcement_start_at?: string;
  enforcement_active?: boolean;
  total_count?: number;
  total_amount?: number;
  groups?: unknown[];
  recommendation?: string;
}
