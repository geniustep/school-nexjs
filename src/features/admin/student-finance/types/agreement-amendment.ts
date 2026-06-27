export type AgreementAmendmentOperationType = 'add_line' | 'cancel_line' | 'modify_line';

export interface AgreementAmendmentLinePayload {
  source_line_id?: number;
  fee_type_id: number;
  amount: number;
}

export interface AgreementAmendmentRequestPayload {
  agreement_id: number;
  operation_type: AgreementAmendmentOperationType;
  effective_period_id?: number;
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

export interface AgreementAmendmentPreviewResponse {
  allowed?: boolean;
  amount_before?: number;
  amount_after?: number;
  delta?: number;
  currency?: string;
  pricing_contract?: unknown;
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
  amountBefore: number | null;
  amountAfter: number | null;
  delta: number | null;
  currency: string | null;
  pricingContract: AgreementAmendmentPricingContract | null;
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
  effectivePeriodId: string;
  reason: string;
  sourceLineId: string;
  feeTypeId: string;
  amount: string;
}
