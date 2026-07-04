import type { FinanceCurrency } from '../types';

export type FinanceAgreementUiStatus =
  | 'active'
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'cancelled'
  | 'requires_review'
  | 'none';

export interface FinanceFeePlanPresentation {
  hasValidPlan: boolean;
  feePlanName: string | null;
  feePlanId: number | null;
  academicYear: string | null;
  cycleLabel: string | null;
  levelLabel: string | null;
  classLabel: string | null;
  agreementNumber: string | null;
  agreementState: string | null;
  agreementUiStatus: FinanceAgreementUiStatus;
  validFrom: string | null;
  validUntil: string | null;
  grossAmount: number | null;
  discountAmount: number | null;
  netAmount: number | null;
  remainingAmount: number | null;
  currency: FinanceCurrency | null;
  showAsInactive: boolean;
  billingPartnerLabel: string | null;
}

export interface FinanceAgreementStatusPresentation {
  uiStatus: FinanceAgreementUiStatus;
  stateLabelKey: string;
  tone: 'ok' | 'warn' | 'danger' | 'neutral';
  showCollectBlockedAlert: boolean;
  collectBlockedAlertKey: string | null;
  requiresReview: boolean;
  agreementNumber: string | null;
  agreementState: string | null;
}

export type FinanceOperationKind =
  | 'agreement_created'
  | 'agreement_submitted'
  | 'agreement_approved'
  | 'agreement_activated'
  | 'agreement_cancelled'
  | 'agreement_reset'
  | 'fees_generated'
  | 'installments_generated'
  | 'payment_collected'
  | 'receipt_issued'
  | 'collection_reversed'
  | 'unknown';

export interface FinanceOperationHistoryEntry {
  id: string;
  date: string | null;
  operationKind: FinanceOperationKind;
  operationLabelKey: string;
  description: string | null;
  performedByLabel: string;
  performedByKey: string;
  state: string | null;
  reference: string | null;
  amount: number | null;
  currency: FinanceCurrency | null;
}

export type FinanceAgreementActionKind =
  | 'create_agreement'
  | 'reset_financial_agreement'
  | 'resolve_finance_review'
  | 'customize_agreement'
  | 'submit_for_review'
  | 'activate_agreement'
  | 'cancel_agreement'
  | 'create_amendment'
  | 'amend_financial_agreement'
  | 'add_service_from_date'
  | 'stop_service_from_date'
  | 'reschedule_remaining'
  | 'terminate_from_date';

export interface FinanceAgreementActionItem {
  kind: FinanceAgreementActionKind;
  labelKey: string;
  enabled: boolean;
  disabledTooltipKey: string | null;
  disabledTooltipText?: string | null;
  primary?: boolean;
}

export interface ResetFinancialAgreementPresentation {
  visible: boolean;
  enabled: boolean;
  endpointAvailable: boolean;
  disabledReasonText: string | null;
  warningKey: string;
}
