// Finance admin resources — synced with Odoo /admin/finance/* (live probe, alwah).

import type { Ref, SchoolRef } from './api';

export type FeeTypeCategory = 'tuition' | 'transport' | 'meals' | 'activities' | string;
export type FeeTypeFrequency = 'annual' | 'term' | 'monthly' | 'once' | string;
export type FeePlanState = 'draft' | 'confirmed' | 'archived' | string;
export type StudentFeeState = 'draft' | 'open' | 'partial' | 'paid' | 'overdue' | 'cancelled' | string;
export type PaymentCollectionState = 'draft' | 'confirmed' | 'cancelled' | string;
export type PaymentMethod = 'cash' | 'check' | 'transfer' | 'card' | string;

export interface FeeType {
  id: number;
  code: string;
  name: string;
  school_id: number;
  category?: FeeTypeCategory;
  frequency?: FeeTypeFrequency;
  default_amount?: number;
  currency?: string;
  is_mandatory?: boolean;
  active?: boolean;
}

export interface FeePlanLine {
  id: number;
  fee_type_id: number;
  fee_type_name?: string;
  description?: string | false;
  amount: number;
  quantity?: number;
  subtotal?: number;
  due_rule?: string;
  due_date?: string | null;
  installment_count?: number;
  is_optional?: boolean;
}

export interface FeePlan {
  id: number;
  code: string;
  name: string;
  school_id: number;
  academic_year_id?: number;
  academic_year?: Ref | string | null;
  level_id?: number | null;
  level?: Ref | null;
  class_id?: number | null;
  class?: Ref | null;
  state?: FeePlanState;
  total_amount?: number;
  currency?: string;
  lines?: FeePlanLine[];
  date_from?: string | null;
  date_to?: string | null;
  notes?: string;
}

export interface FeePlanLineInput {
  fee_type_id: number;
  amount: number;
  quantity?: number;
  due_date?: string;
  installment_count?: number;
  due_rule?: string;
  is_optional?: boolean;
  description?: string;
}

export interface Installment {
  id?: number;
  name?: string;
  sequence?: number;
  due_date?: string;
  amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  state?: string;
  status?: string;
}

export interface Discount {
  id?: number;
  name?: string;
  type?: string;
  amount?: number;
  percent?: number;
  reason?: string;
  state?: string;
  status?: string;
  effective_date?: string;
  date_from?: string;
}

export interface PaymentAllocation {
  id?: number;
  student_fee_id?: number;
  installment_id?: number;
  amount?: number;
  student_fee?: Ref;
  installment?: Ref;
}

export interface StudentFee {
  id: number;
  student_id?: number;
  student?: Ref;
  school?: SchoolRef;
  academic_year_id?: number;
  academic_year?: Ref | string | null;
  fee_plan_id?: number;
  fee_plan?: Ref;
  fee_type_id?: number;
  fee_type?: Ref;
  original_amount?: number;
  discount_amount?: number;
  net_amount?: number;
  amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  balance?: number;
  state?: StudentFeeState;
  status?: StudentFeeState;
  due_date?: string | null;
  next_due_date?: string | null;
  currency?: string;
  installments?: Installment[];
  discounts?: Discount[];
  lines?: Installment[];
}

export interface PaymentCollection {
  id: number;
  reference?: string;
  name?: string;
  student_id?: number;
  student?: Ref;
  school?: SchoolRef;
  academic_year_id?: number;
  academic_year?: Ref | string | null;
  billing_partner_id?: number;
  billing_partner?: Ref;
  payer_name?: string;
  amount?: number;
  total_amount?: number;
  payment_method?: PaymentMethod;
  collection_date?: string;
  date?: string;
  state?: PaymentCollectionState;
  status?: PaymentCollectionState;
  notes?: string;
  journal_id?: number;
  created_by?: Ref;
  user?: Ref;
  allocations?: PaymentAllocation[];
  status_history?: { state?: string; date?: string; user?: Ref }[];
}

export interface StudentFinanceProfile {
  student_id?: number;
  student?: Ref;
  school?: SchoolRef;
  academic_year_id?: number;
  academic_year?: Ref | string | null;
  billing_partner_id?: number;
  billing_partner?: Ref;
  billing_partner_type?: string;
  payer_name?: string;
  payer_phone?: string;
  guardian_id?: number;
  guardian?: Ref;
  total_amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  overdue_amount?: number;
  balance?: number;
  currency?: string;
  fees?: StudentFee[];
  installments?: Installment[];
  discounts?: Discount[];
  collections?: PaymentCollection[];
}

export interface CreateFeeTypePayload {
  name: string;
  code: string;
  category?: FeeTypeCategory;
  frequency?: FeeTypeFrequency;
  default_amount?: number;
  is_mandatory?: boolean;
}

export interface CreateFeePlanPayload {
  school_id: number;
  name: string;
  code: string;
  academic_year_id: number;
  level_id?: number;
  class_id?: number;
  lines?: FeePlanLineInput[];
  date_from?: string;
  date_to?: string;
  notes?: string;
}

export interface UpdateFeePlanPayload {
  name?: string;
  code?: string;
  level_id?: number | null;
  class_id?: number | null;
  lines?: FeePlanLineInput[];
  date_from?: string | null;
  date_to?: string | null;
  notes?: string;
}

export interface AssignStudentFeePayload {
  fee_plan_id: number;
  academic_year_id?: number;
}

export interface CreatePaymentCollectionPayload {
  student_id: number;
  academic_year_id: number;
  journal_id: number;
  billing_partner_id: number;
  amount: number;
  payment_method: PaymentMethod;
  collection_date: string;
  reference?: string;
  notes?: string;
  allocations?: { student_fee_id?: number; installment_id?: number; amount: number }[];
}

export interface UpdateBillingProfilePayload {
  billing_partner_type?: string;
  billing_partner_id?: number;
  guardian_id?: number;
  payer_name?: string;
  payer_phone?: string;
}
