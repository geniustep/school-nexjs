import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { emitFinanceRefresh } from '@/lib/finance/finance-refresh-bus';
import type { CollectionUpdatedOverview } from '@/types/student-financial-overview';
import type { FinanceCheque, PaymentCollection } from '@/types/finance';

export type ChequeRejectionReasonCode =
  | 'insufficient_funds'
  | 'signature_mismatch'
  | 'account_closed'
  | 'payment_stopped'
  | 'invalid_cheque'
  | 'technical_rejection'
  | 'other';

export const CHEQUE_REJECTION_REASON_CODES: ChequeRejectionReasonCode[] = [
  'insufficient_funds',
  'signature_mismatch',
  'account_closed',
  'payment_stopped',
  'invalid_cheque',
  'technical_rejection',
  'other',
];

export interface ChequeSettlePayload {
  settlement_date: string;
  bank_reference?: string | null;
  note?: string | null;
}

export interface ChequeRejectPayload {
  rejection_date: string;
  reason_code: ChequeRejectionReasonCode;
  reason?: string | null;
  bank_reference?: string | null;
  note?: string | null;
}

export interface ChequeLifecycleTransitionData {
  cheque?: FinanceCheque;
  collection?: PaymentCollection;
  receipt?: unknown;
  affected_installments?: unknown[];
  updated_overview?: CollectionUpdatedOverview | null;
}

export async function postChequeSettle(chequeId: number, payload: ChequeSettlePayload) {
  return api.post<ChequeLifecycleTransitionData>(
    endpoints.admin.financeChequeSettle(chequeId),
    payload,
  );
}

export async function postChequeReject(chequeId: number, payload: ChequeRejectPayload) {
  return api.post<ChequeLifecycleTransitionData>(
    endpoints.admin.financeChequeReject(chequeId),
    payload,
  );
}

export function extractChequeTransitionData(
  data: ChequeLifecycleTransitionData | null | undefined,
): ChequeLifecycleTransitionData {
  if (!data || typeof data !== 'object') return {};
  return data;
}

export function notifyFinanceLifecycleRefresh(input: {
  studentId?: number | null;
  collectionId?: number | null;
  chequeId?: number | null;
  updatedOverview?: CollectionUpdatedOverview | null;
}): void {
  emitFinanceRefresh({
    studentId: input.studentId ?? undefined,
    collectionId: input.collectionId ?? undefined,
    chequeId: input.chequeId ?? undefined,
  });
}
