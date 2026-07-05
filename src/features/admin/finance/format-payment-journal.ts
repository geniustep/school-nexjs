import { isCashJournal } from '@/lib/utils/cash-payment';
import { isChequePayment } from '@/lib/utils/cheque';
import { normalizePaymentMethodOptions } from '@/lib/utils/finance-normalize';
import type { PaymentJournal } from '@/types/finance';

function paymentMethodCode(method: string | { code?: string }): string | undefined {
  return typeof method === 'string' ? method : method.code;
}

function journalType(journal: PaymentJournal): string {
  return (journal.type ?? journal.journal_type ?? '').toLowerCase();
}

function isBankJournal(journal: PaymentJournal): boolean {
  const type = journalType(journal);
  return type === 'bank' || type === 'transfer';
}

function isChequeDedicatedJournal(journal: PaymentJournal): boolean {
  const codes = resolveJournalAllowedMethodCodes(journal).map((code) => code.toLowerCase());
  if (!codes.length) return false;
  return codes.every((code) => code === 'cheque' || code === 'check');
}

function pickAllowedMethod(codes: string[], candidates: string[]): string | null {
  const normalized = codes.map((code) => code.toLowerCase());
  for (const candidate of candidates) {
    const index = normalized.indexOf(candidate.toLowerCase());
    if (index >= 0) return codes[index];
  }
  return null;
}

export function resolveJournalAllowedMethodCodes(
  journal: PaymentJournal | null | undefined,
): string[] {
  if (!journal) return [];
  return normalizePaymentMethodOptions(journal.allowed_payment_methods).map((method) => method.code);
}

export type JournalPaymentMethodInference = {
  method: string | null;
  ambiguous: boolean;
};

/** Infer the default payment method from journal type and allowed methods. */
export function inferPaymentMethodFromJournal(
  journal: PaymentJournal | null | undefined,
): JournalPaymentMethodInference {
  if (!journal) return { method: null, ambiguous: false };

  const allowed = resolveJournalAllowedMethodCodes(journal);
  if (allowed.length === 1) {
    return { method: allowed[0], ambiguous: false };
  }

  if (isCashJournal(journal)) {
    const cash = pickAllowedMethod(allowed, ['cash']);
    if (cash) return { method: cash, ambiguous: false };
  }

  if (isBankJournal(journal)) {
    const bank = pickAllowedMethod(allowed, ['bank_transfer', 'transfer', 'bank']);
    if (bank) return { method: bank, ambiguous: false };
  }

  if (isChequeDedicatedJournal(journal)) {
    const cheque = pickAllowedMethod(allowed, ['cheque', 'check']);
    if (cheque) return { method: isChequePayment(cheque) ? 'cheque' : cheque, ambiguous: false };
  }

  if (allowed.length > 1) {
    return { method: null, ambiguous: true };
  }

  if (isCashJournal(journal)) return { method: 'cash', ambiguous: false };
  if (isBankJournal(journal)) return { method: 'bank_transfer', ambiguous: false };
  if (isChequeDedicatedJournal(journal)) return { method: 'cheque', ambiguous: false };

  return { method: null, ambiguous: true };
}

export function needsManualPaymentMethodSelection(
  journal: PaymentJournal | null | undefined,
): boolean {
  return inferPaymentMethodFromJournal(journal).ambiguous;
}

/** Human-readable journal label: «البنك — BNK1». */
export function formatPaymentJournalLabel(journal: PaymentJournal): string {
  const name = journal.name?.trim() || '';
  const code = journal.code?.trim();
  if (name && code) return `${name} — ${code}`;
  return name || code || `#${journal.id}`;
}

export function journalsSupportingMethod(
  journals: PaymentJournal[],
  methodCode: string,
): PaymentJournal[] {
  return journals.filter((j) =>
    (j.allowed_payment_methods ?? []).some((m) => {
      const code = paymentMethodCode(m as string | { code?: string });
      return code === methodCode || (methodCode === 'cheque' && code === 'check');
    }),
  );
}

/** Prefer the cash journal when multiple payment journals are available. */
export function resolveDefaultPaymentJournal(journals: PaymentJournal[]): PaymentJournal | null {
  if (!journals.length) return null;
  if (journals.length === 1) return journals[0];
  return journals.find(isCashJournal) ?? journals[0];
}
