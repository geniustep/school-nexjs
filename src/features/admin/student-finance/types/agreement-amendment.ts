export type AgreementAmendmentOperationType =
  | 'add_line'
  | 'cancel_line'
  | 'modify_line'
  | 'adjust_line_amount'
  | 'adjust_installment_amount';

export type AgreementAmendmentPath = 'adjust_amount' | 'period_range';

export interface AgreementAmendmentPeriodAmountOverridePayload {
  effective_period_id: number;
  amount: number;
}

export interface AgreementAmendmentLinePayload {
  source_line_id?: number;
  agreement_line_id?: number;
  fee_type_id?: number;
  operational_installment_id?: number;
  amount?: number;
  new_unit_price?: number;
  period_amount_overrides?: AgreementAmendmentPeriodAmountOverridePayload[];
}

export interface AgreementAmendmentAmbiguousLineCandidate {
  sourceLineId: number;
  agreementLineId: number | null;
  serviceName: string;
  commitmentType: string | null;
  pricingUnit: string | null;
  quantity: number | null;
  unitPrice: number | null;
  netAmount: number | null;
  periodAmendable: boolean;
  amendmentBlockReason: string | null;
  amountAmendable: boolean;
  amountAmendmentBlockReason: string | null;
  supportedAmendmentOperations: AgreementAmendmentOperationType[];
  duplicateServiceWarning: boolean;
}

export interface AgreementAmendmentRequestPayload {
  agreement_id: number;
  operation_type: AgreementAmendmentOperationType;
  effective_period_id?: number;
  effective_period_ids?: number[];
  effective_period_end_id?: number;
  effective_date?: string;
  reason: string;
  line: AgreementAmendmentLinePayload;
}

export interface AgreementAmendmentPeriodOption {
  id: number;
  label: string;
  periodKey?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  sequence?: number | null;
  selectable?: boolean;
  disabledReason?: string | null;
}

export interface AgreementAmendmentInstallmentPreview {
  id?: number | null;
  label: string;
  amount: number | null;
  state?: string | null;
}

export interface AgreementAmendmentPricingContract {
  amountSemantics?: string | null;
  currentUnitPrice?: number | null;
  newUnitPrice?: number | null;
  affectedPeriodCount?: number | null;
  currentTotalForAffectedPeriods?: number | null;
  newTotalForAffectedPeriods?: number | null;
  deltaTotal?: number | null;
}

export interface AgreementAmendmentWarning {
  code: string;
  message?: string | null;
  params?: Record<string, string | number>;
}

export interface AgreementAmendmentPeriodImpact {
  effectivePeriodId: number | null;
  periodKey: string | null;
  label: string | null;
  currentAmount: number | null;
  proposedAmount: number | null;
  delta: number | null;
  overrideApplied: boolean;
  amendable: boolean;
  blockingReasons: AgreementAmendmentWarning[];
}

export interface AgreementAmendmentCurrentAgreementBrief {
  id: number | null;
  name: string | null;
  state: string | null;
  netAmount: number | null;
  remainingTotal: number | null;
  paidTotal: number | null;
}

export interface AgreementAmendmentPreviewResponse {
  allowed?: boolean;
  can_apply?: boolean;
  amend_block_code?: string;
  requires_finance_review?: boolean;
  finance_review_reasons?: unknown[];
  amount_before?: number;
  amount_after?: number;
  delta?: number;
  currency?: string;
  pricing_contract?: unknown;
  current_agreement?: unknown;
  selection_mode?: string;
  selected_period_ids?: unknown[];
  period_impacts?: unknown[];
  affected_periods?: unknown[];
  locked_periods?: unknown[];
  warnings?: unknown[];
  blocking_reasons?: unknown[];
  reason?: string;
  open_periods?: unknown[];
  available_periods?: unknown[];
  effective_periods?: unknown[];
  effective_period?: {
    id?: number;
    period_key?: string;
    label?: string;
    period_start?: string;
    period_end?: string;
  };
  created_installments?: unknown[];
  updated_installments?: unknown[];
  cancelled_installments?: unknown[];
  created_installments_preview?: unknown[];
  updated_installments_preview?: unknown[];
  cancelled_installments_preview?: unknown[];
}

export interface NormalizedAgreementAmendmentPreview {
  allowed: boolean;
  canApply: boolean;
  amendBlockCode: string | null;
  financeReviewReasons: string[];
  amountBefore: number | null;
  amountAfter: number | null;
  delta: number | null;
  currency: string | null;
  pricingContract: AgreementAmendmentPricingContract | null;
  currentAgreement?: AgreementAmendmentCurrentAgreementBrief | null;
  selectionMode?: string | null;
  selectedPeriodIds?: number[];
  periodImpacts?: AgreementAmendmentPeriodImpact[];
  affectedPeriods: string[];
  lockedPeriods: string[];
  warnings: AgreementAmendmentWarning[];
  blockingReasons: AgreementAmendmentWarning[];
  createdInstallments: AgreementAmendmentInstallmentPreview[];
  updatedInstallments: AgreementAmendmentInstallmentPreview[];
  cancelledInstallments: AgreementAmendmentInstallmentPreview[];
  openPeriods: AgreementAmendmentPeriodOption[];
}

export interface AgreementAmendmentFormState {
  operationType: AgreementAmendmentOperationType;
  amendmentPath: AgreementAmendmentPath | '';
  effectivePeriodId: string;
  effectivePeriodEndId: string;
  selectedPeriodIds?: string[];
  periodAmountOverrides?: Record<string, string>;
  reason: string;
  sourceLineId: string;
  feeTypeId: string;
  amount: string;
}
