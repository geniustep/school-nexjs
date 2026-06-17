import type { PaymentJournal } from '@/types/finance';

function paymentMethodCode(method: string | { code?: string }): string | undefined {
  return typeof method === 'string' ? method : method.code;
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
