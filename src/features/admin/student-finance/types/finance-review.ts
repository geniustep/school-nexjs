import type { Ref } from '@/types/api';

export type FinanceReviewReasonCode = 'billing_partner_mismatch' | string;

export interface BillingPartnerMismatchDetail {
  code: 'billing_partner_mismatch';
  agreement_id?: number;
  agreement_partner?: Ref | null;
  profile_partner?: Ref | null;
  finance_profile_id?: number;
  resolution_available?: boolean;
  resolution_strategy?: string | null;
  resolution_block_reason?: string | null;
  resolution_message?: string | null;
}

export interface FinanceReviewBillingPartnerPresentation {
  agreementPartnerName: string | null;
  profilePartnerName: string | null;
  resolutionAvailable: boolean;
  resolutionBlockReason: string | null;
  resolutionMessage: string | null;
  resolutionStrategy: string | null;
  agreementId: number | null;
}

export interface FinanceReviewPresentation {
  visible: boolean;
  hasBillingPartnerMismatch: boolean;
  billingPartnerMismatch: FinanceReviewBillingPartnerPresentation | null;
}

export interface ResolveFinanceReviewPayload {
  reason: string;
  strategy: 'align_agreement_to_profile';
}

export interface ResolveFinanceReviewResponse {
  finance_workspace?: unknown;
  agreement?: unknown;
}
