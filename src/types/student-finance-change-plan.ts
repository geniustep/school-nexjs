export type ChangePlanMode = 'replace_if_unpaid' | 'social_discount_on_future_installments';

export type ChangePlanActivationMode = 'draft' | 'activate';

export type ChangePlanDiscountType = 'percent' | 'amount';

export interface ChangePlanDiscount {
  fee_type_code: string;
  type: ChangePlanDiscountType;
  value: number;
  discount_type: 'social';
}

export interface ReplaceIfUnpaidChangePlanPayload {
  mode: 'replace_if_unpaid';
  new_fee_plan_id: number;
  activation_mode: ChangePlanActivationMode;
  confirm_replace_current_agreement?: boolean;
  change_reason: string;
}

export interface SocialDiscountChangePlanPayload {
  mode: 'social_discount_on_future_installments';
  effective_date: string;
  change_reason: 'social_case';
  reason_note: string;
  discounts: ChangePlanDiscount[];
  affected_periods: string[];
  confirm_financial_impact?: boolean;
}

export type ChangePlanPayload = ReplaceIfUnpaidChangePlanPayload | SocialDiscountChangePlanPayload;

export interface NormalizedChangePlanPreview {
  canApply: boolean;
  blockingReasons: string[];
  warnings: string[];
  currentAgreementLabel?: string | null;
  currentFeePlanLabel?: string | null;
  newFeePlanLabel?: string | null;
  willAmendCurrent?: boolean;
  willCreateNew?: boolean;
  newAgreementStateLabel?: string | null;
  preservedPeriods: string[];
  affectedPeriods: string[];
  oldAmount?: number | null;
  newAmount?: number | null;
  discountAmount?: number | null;
  currency?: string | null;
}
