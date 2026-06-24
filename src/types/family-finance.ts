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
  student_id: number;
  student_name?: string | null;
  service_type?: FamilyFinanceServiceType | string | null;
  service_label?: string | null;
  due_date?: string | null;
  remaining_amount?: number | null;
  is_overdue?: boolean | null;
}

export interface FamilyCollectionContext {
  family_id?: number | null;
  total_remaining?: number | null;
  total_overdue?: number | null;
  credit_balance?: number | null;
  open_installments: FamilyOpenInstallment[];
  currency?: string | null;
}

export type FamilyCollectionAllocationMode =
  | 'oldest_due_first'
  | 'by_student'
  | 'by_service'
  | 'manual'
  | 'leave_as_family_credit';

export interface FamilyCollectionPreviewRequest {
  family_id: number;
  student_id?: number | null;
  amount: number;
  allocation_mode: FamilyCollectionAllocationMode;
  manual_allocations?: unknown[];
}

export interface FamilyCollectionAllocation {
  student_id?: number | null;
  student_name?: string | null;
  installment_id?: number | null;
  service_type?: FamilyFinanceServiceType | string | null;
  service_label?: string | null;
  allocated_amount?: number | null;
  due_date?: string | null;
}

export interface FamilyCollectionPreviewResponse {
  amount?: number | null;
  allocated_amount?: number | null;
  unallocated_amount?: number | null;
  credit_amount?: number | null;
  credit_balance?: number | null;
  allocation_mode?: FamilyCollectionAllocationMode | string | null;
  allocations: FamilyCollectionAllocation[];
  warnings: string[];
  errors: string[];
}
