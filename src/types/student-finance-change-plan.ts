export type ChangePlanMode = 'replace_if_unpaid' | 'social_discount_on_future_installments';

export interface CarryForwardPlanChangePreviewPayload {
  mode: 'carry_forward_plan_change';
  level_id: number;
  academic_year_id?: number;
}

export interface CarryForwardFeeSupersessionPreview {
  feeId: number | null;
  feeTypeCode: string | null;
  serviceCode: string | null;
  lockedObligationTotal: number | null;
  replaceableObligationTotal: number | null;
  recognizedPaid: number | null;
  balanceBefore: number | null;
  totalBenefit: number | null;
  consumedBenefit: number | null;
  residualCustomization: number | null;
  targetFutureBase: number | null;
  targetFutureNet: number | null;
  futurePeriodCount: number | null;
  semantics: string | null;
}

export interface NormalizedAcademicPlacementFinancePreview {
  canApply: boolean;
  previewToken: string | null;
  targetLevelId: number | null;
  targetPlanId: number | null;
  effectivePeriodId: number | null;
  effectivePeriodKey: string | null;
  currentAgreement: {
    id: number | null;
    feePlanId: number | null;
    paidTotal: number | null;
    remainingTotal: number | null;
  };
  feeSupersessions: CarryForwardFeeSupersessionPreview[];
  preservedOldOnlyServices: string[];
  alreadySatisfiedOneTime: string[];
  blockingReasons: string[];
  warnings: string[];
}

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
  /** True when Backend marks a legacy mode (e.g. retired social discount) as deprecated. */
  deprecated?: boolean;
  replacementWorkflow?: string | null;
  replacementOperation?: string | null;
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
