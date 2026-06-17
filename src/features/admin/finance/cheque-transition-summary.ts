import {
  getChequeDisplayNumber,
  getChequePayerLabel,
  getChequeStudentLabel,
  normalizeChequeDetail,
} from '@/features/admin/finance/cheque-normalize';
import { currencyCode } from '@/lib/utils/finance';
import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type { FinanceCheque } from '@/types/finance';

export type ChequeTransitionSummary = {
  chequeNumber: string;
  amount: number | null;
  currency: string | null;
  partyName: string | null;
  billingPartyName: string | null;
  currentState: string;
  settlementStatus: string | null;
};

export function buildChequeTransitionSummary(cheque: FinanceCheque): ChequeTransitionSummary {
  const detail = normalizeChequeDetail(cheque);
  return {
    chequeNumber: detail.displayNumber,
    amount: normalizeMoneyValue(detail.amount ?? cheque.amount),
    currency: currencyCode(detail.currency ?? cheque.currency),
    partyName: detail.studentName ?? detail.payer ?? getChequeStudentLabel(cheque) ?? getChequePayerLabel(cheque),
    billingPartyName: getChequePayerLabel(cheque),
    currentState: cheque.state ?? 'received',
    settlementStatus: cheque.settlement_status ?? null,
  };
}
