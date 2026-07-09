export type CollectionAllocationPriorityLevel = 'first' | 'normal' | 'last';

export type FamilyFinanceServiceType =
  | 'tuition'
  | 'registration'
  | 'transport'
  | 'canteen'
  | 'books'
  | 'activities'
  | 'other';

export interface FamilyFinanceServiceSummary {
  service_type: FamilyFinanceServiceType;
  label?: string | null;
  amount_due?: number | null;
  amount_paid?: number | null;
  amount_remaining?: number | null;
}

export interface FamilyFinanceChild {
  student_id: number;
  student_name?: string | null;
  class_name?: string | null;
  level_name?: string | null;
  section_name?: string | null;
  total_net_due?: number | null;
  total_paid?: number | null;
  total_remaining?: number | null;
  total_overdue?: number | null;
  services_summary: FamilyFinanceServiceSummary[];
}

export interface FamilyFinanceSummary {
  family_id: number;
  billing_partner_id?: number | null;
  billing_partner_name?: string | null;
  display_name?: string | null;
  student_count?: number | null;
  total_net_due?: number | null;
  total_paid?: number | null;
  total_remaining?: number | null;
  total_overdue?: number | null;
  credit_balance?: number | null;
  unallocated_amount?: number | null;
  children: FamilyFinanceChild[];
  currency?: string | null;
}

export interface FamilyPlanSibling {
  student_id: number;
  student_name?: string | null;
  has_active_agreement?: boolean | null;
}

export interface FamilyPlanContext {
  family_id?: number | null;
  sibling_count?: number | null;
  siblings: FamilyPlanSibling[];
  has_active_sibling_agreements?: boolean | null;
  family_has_overdue?: boolean | null;
  eligible_family_discount_hint?: {
    eligible?: boolean | null;
    reason?: string | null;
  } | null;
}

export interface FamilyOpenInstallment {
  installment_id: number;
  student_id: number;
  student_name?: string | null;
  class_name?: string | null;
  level_name?: string | null;
  section_name?: string | null;
  service_type?: FamilyFinanceServiceType | string | null;
  service_label?: string | null;
  due_date?: string | null;
  remaining_amount?: number | null;
  is_overdue?: boolean | null;
  allocation_priority_level?: CollectionAllocationPriorityLevel | string | null;
  allocation_priority_weight?: number | null;
  suggestion_order?: number | null;
}

export interface FamilyCollectionContext {
  family_id?: number | null;
  total_remaining?: number | null;
  total_overdue?: number | null;
  credit_balance?: number | null;
  open_installments: FamilyOpenInstallment[];
  currency?: string | null;
}

/** Explicit allocation line sent to the backend (installment_id + amount only). */
export interface FamilyCollectionAllocationInput {
  installment_id: number;
  amount: number;
}

export interface FamilyCollectionPreviewRequest {
  family_id: number;
  amount: number;
  student_id?: number | null;
  allocation_mode?: FamilyCollectionAllocationMode;
  manual_allocations?: unknown[];
  allocations?: FamilyCollectionAllocationInput[];
}

export interface FamilyCollectionAllocation {
  student_id?: number | null;
  student_name?: string | null;
  installment_id?: number | null;
  service_type?: FamilyFinanceServiceType | string | null;
  service_label?: string | null;
  allocated_amount?: number | null;
  amount?: number | null;
  due_date?: string | null;
}

export interface FamilyCollectionPreviewResponse {
  amount?: number | null;
  allocated_amount?: number | null;
  unallocated_amount?: number | null;
  credit_amount?: number | null;
  credit_balance?: number | null;
  allocations: FamilyCollectionAllocation[];
  warnings: string[];
  errors: string[];
}

export interface FamilyCollectionDraftRequest {
  family_id: number;
  academic_year_id: number;
  journal_id: number;
  amount: number;
  payment_method: string;
  collection_date?: string | null;
  allocations: FamilyCollectionAllocationInput[];
  idempotency_key?: string;
  notes?: string | null;
  actual_payer_name?: string | null;
}

export interface FamilyCollectionDetail {
  id: number;
  family_id?: number | null;
  billing_partner_id?: number | null;
  state?: string | null;
  amount?: number | null;
  allocated_amount?: number | null;
  unallocated_amount?: number | null;
  payment_method?: string | null;
  journal_id?: number | null;
  academic_year_id?: number | null;
  collection_date?: string | null;
  allocations: FamilyCollectionAllocation[];
  receipt_id?: number | null;
  warnings?: string[];
}

export interface FamilyCollectionRecord {
  id: number;
  name?: string | null;
  student_id?: number | null;
  amount?: number | null;
  state?: string | null;
}

export interface FamilyCollectionReceiptRecord {
  id: number;
  name?: string | null;
  collection_id?: number | null;
}

export interface FamilyCollectionCreateResponse {
  ok?: boolean;
  id?: number | null;
  collection_id?: number | null;
  family_id?: number | null;
  billing_partner_id?: number | null;
  state?: string | null;
  amount?: number | null;
  allocated_amount?: number | null;
  unallocated_amount?: number | null;
  receipt_id?: number | null;
  collections: FamilyCollectionRecord[];
  receipts: FamilyCollectionReceiptRecord[];
  total_received?: number | null;
  total_allocated?: number | null;
  total_unallocated?: number | null;
  allocations?: FamilyCollectionAllocation[];
  warnings: string[];
}

export interface FamilyCollectionConfirmResponse {
  ok?: boolean;
  collection_id?: number | null;
  id?: number | null;
  state?: string | null;
  receipt_id?: number | null;
  receipt_number?: string | null;
  allocated_amount?: number | null;
  unallocated_amount?: number | null;
  warnings?: string[];
}

/** @deprecated Use FamilyCollectionDraftRequest — kept for legacy callers during transition. */
export type FamilyCollectionCreateRequest = FamilyCollectionDraftRequest;

/** @deprecated Removed from backend contract — manual allocations are always explicit. */
export type FamilyCollectionAllocationMode =
  | 'oldest_due_first'
  | 'by_student'
  | 'by_service'
  | 'manual'
  | 'leave_as_family_credit';
