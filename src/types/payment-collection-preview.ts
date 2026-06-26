export type PaymentCollectionAllocationStrategy = 'oldest_due_first';

export type PaymentCollectionPreviewAllocationStatus = 'paid' | 'partial' | string;

export interface PaymentCollectionPreviewAllocation {
  installment_id: number;
  student_fee_id?: number | null;
  amount: number;
  status_after: PaymentCollectionPreviewAllocationStatus;
  period_label?: string | null;
  display_label?: string | null;
  fee_name?: string | null;
}

export interface PaymentCollectionPreview {
  amount: number;
  prepayment_allowed: boolean;
  remaining_total: number;
  allocated_amount: number;
  unallocated_amount: number;
  allocations: PaymentCollectionPreviewAllocation[];
  errors: string[];
  /** True when preview succeeded and amount can be submitted. */
  is_valid: boolean;
  /** True when amount covers more than the first open installment. */
  is_prepayment: boolean;
}

export interface PaymentCollectionPreviewRequest {
  student_id: number;
  academic_year_id: number;
  amount: number;
  strategy?: PaymentCollectionAllocationStrategy;
  agreement_id?: number;
  billing_partner_id?: number;
  billing_profile_id?: number;
}

export interface CollectionGate {
  collect_allowed: boolean;
  collect_block_reason?: string | null;
  collect_block_message?: string | null;
  prepayment_allowed: boolean;
}

export interface CollectibleBillingContext {
  mode?: string | null;
  has_active_agreement?: boolean;
  has_operational_fees?: boolean;
  message?: string | null;
}
