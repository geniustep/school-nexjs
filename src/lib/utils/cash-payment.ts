import { normalizePaymentMethodCode } from '@/lib/utils/finance-normalize';

const CASH_METHOD_CODES = new Set(['cash']);

/** Detect cash payment from official method code — never from translated labels. */
export function isCashPayment(method: string | undefined | null): boolean {
  const code = normalizePaymentMethodCode(method).toLowerCase();
  return CASH_METHOD_CODES.has(code);
}

export function paymentMethodRequiresCashSession(
  method: string | undefined | null,
  metadata?: { requires_cash_session?: boolean | null },
): boolean {
  if (metadata?.requires_cash_session != null) return metadata.requires_cash_session;
  return isCashPayment(method);
}

export function isCashJournal(journal: { type?: string; journal_type?: string } | null | undefined): boolean {
  const type = (journal?.type ?? journal?.journal_type ?? '').toLowerCase();
  return type === 'cash';
}
