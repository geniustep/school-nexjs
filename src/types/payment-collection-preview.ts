export type PaymentCollectionAllocationStrategy = 'oldest_due_first';

export type PaymentCollectionPreviewAllocationStatus = 'paid' | 'partial' | string;

export interface PaymentCollectionPreviewAllocation {
  installment_id: number;
  student_fee_id?: number | null;
  amount: number;
  /** Amount Odoo reports as allocated to this installment (defaults to `amount`). */
  allocated_amount?: number;
  status_after: PaymentCollectionPreviewAllocationStatus;
  /** True when Odoo allocates this payment to a future (not-yet-due) installment. */
  is_future_allocation?: boolean;
  period_label?: string | null;
  display_label?: string | null;
  fee_name?: string | null;
}

/** Payment-level summary returned by the Odoo advance-payment / credit-balance contract. */
export interface PaymentCollectionPaymentSummary {
  amount_paid: number;
  allocated_amount: number;
  unallocated_amount: number;
  resulting_credit_balance: number;
}

/** Allocation-level summary returned by Odoo (display only, no recompute in Next.js). */
export interface PaymentCollectionAllocationSummary {
  mode?: string | null;
  allocations_count?: number | null;
  future_allocations_count?: number | null;
}

/** Actions Odoo permits for this preview. Next.js only toggles UI states from these. */
export interface PaymentCollectionPreviewAllowedActions {
  can_confirm_with_credit_balance?: boolean;
  can_allocate_to_future_installments?: boolean;
}

export interface PaymentCollectionPreview {
  amount: number;
  prepayment_allowed: boolean;
  remaining_total: number;
  allocated_amount: number;
  unallocated_amount: number;
  /**
   * Credit balance Odoo will record after this payment. Source of truth — never
   * recomputed in Next.js. A positive value does NOT make any installment paid.
   */
  resulting_credit_balance: number;
  /** Existing credit applied/available as reported by Odoo (display only). */
  credit_amount: number;
  allocations: PaymentCollectionPreviewAllocation[];
  warnings: string[];
  errors: string[];
  payment_summary: PaymentCollectionPaymentSummary | null;
  allocation_summary: PaymentCollectionAllocationSummary | null;
  allowed_actions: PaymentCollectionPreviewAllowedActions | null;
  /** True when preview succeeded and amount can be submitted. */
  is_valid: boolean;
  /** True when amount covers more than the first open installment. */
  is_prepayment: boolean;
}

export interface PaymentCollectionPreviewRequestAllocation {
  installment_id: number;
  student_fee_id?: number;
  amount: number;
}

export interface PaymentCollectionPreviewRequest {
  student_id: number;
  academic_year_id: number;
  amount: number;
  strategy?: PaymentCollectionAllocationStrategy;
  allocation_mode?: 'oldest_due_first' | 'selected_installments';
  allocations?: PaymentCollectionPreviewRequestAllocation[];
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
