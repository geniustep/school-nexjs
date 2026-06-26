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
  | 'create_agreement'
  | 'update_agreement'
  | 'cancel_agreement'
  | 'activate_agreement'
  | 'generate_installments'
  | 'record_collection'
  | 'issue_receipt'
  | 'reverse_operation'
  | 'reset_financial_agreement'
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
}

export type FinanceAgreementActionKind =
  | 'create_agreement'
  | 'reset_financial_agreement'
  | 'customize_agreement'
  | 'submit_for_review'
  | 'activate_agreement'
  | 'cancel_agreement'
  | 'create_amendment'
  | 'add_service_from_date'
  | 'stop_service_from_date'
  | 'reschedule_remaining'
  | 'terminate_from_date';

export interface FinanceAgreementActionItem {
  kind: FinanceAgreementActionKind;
  labelKey: string;
  enabled: boolean;
  disabledTooltipKey: string | null;
  primary?: boolean;
}

export interface ResetFinancialAgreementPresentation {
  visible: boolean;
  enabled: boolean;
  endpointAvailable: boolean;
  reasonKey: string;
}
