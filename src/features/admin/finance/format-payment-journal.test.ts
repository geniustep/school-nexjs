import { describe, expect, it } from 'vitest';
import { resolveDefaultPaymentJournal } from '@/features/admin/finance/format-payment-journal';
import type { PaymentJournal } from '@/types/finance';

describe('resolveDefaultPaymentJournal', () => {
  it('returns null when no journals exist', () => {
    expect(resolveDefaultPaymentJournal([])).toBeNull();
  });

  it('returns the only journal when one is available', () => {
    const journal = { id: 1, name: 'Bank', journal_type: 'bank' } as PaymentJournal;
    expect(resolveDefaultPaymentJournal([journal])).toBe(journal);
  });

  it('prefers the cash journal when multiple journals exist', () => {
    const bank = { id: 1, name: 'Bank', journal_type: 'bank' } as PaymentJournal;
    const cash = { id: 2, name: 'Cash', journal_type: 'cash' } as PaymentJournal;
    expect(resolveDefaultPaymentJournal([bank, cash])?.id).toBe(2);
  });

  it('falls back to the first journal when no cash journal exists', () => {
    const bank = { id: 1, name: 'Bank', journal_type: 'bank' } as PaymentJournal;
    const cheque = { id: 2, name: 'Cheque', type: 'bank' } as PaymentJournal;
    expect(resolveDefaultPaymentJournal([bank, cheque])?.id).toBe(1);
  });
});
