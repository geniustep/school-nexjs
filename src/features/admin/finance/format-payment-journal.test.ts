import { describe, expect, it } from 'vitest';
import {
  inferPaymentMethodFromJournal,
  needsManualPaymentMethodSelection,
  resolveDefaultPaymentJournal,
} from '@/features/admin/finance/format-payment-journal';
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

describe('inferPaymentMethodFromJournal', () => {
  it('infers cash from a cash journal with one allowed method', () => {
    const journal = {
      id: 1,
      name: 'Cash',
      code: 'CSH1',
      journal_type: 'cash',
      allowed_payment_methods: [{ code: 'cash' }],
    } as never;
    expect(inferPaymentMethodFromJournal(journal)).toEqual({ method: 'cash', ambiguous: false });
    expect(needsManualPaymentMethodSelection(journal)).toBe(false);
  });

  it('infers bank_transfer from a bank journal', () => {
    const journal = {
      id: 2,
      name: 'Bank',
      code: 'BNK1',
      journal_type: 'bank',
      allowed_payment_methods: [{ code: 'bank_transfer' }, { code: 'card' }],
    } as never;
    expect(inferPaymentMethodFromJournal(journal)).toEqual({
      method: 'bank_transfer',
      ambiguous: false,
    });
  });

  it('infers cheque from a cheque-only journal', () => {
    const journal = {
      id: 3,
      name: 'Cheques',
      code: 'CHQ1',
      journal_type: 'bank',
      allowed_payment_methods: [{ code: 'cheque' }],
    } as never;
    expect(inferPaymentMethodFromJournal(journal)).toEqual({ method: 'cheque', ambiguous: false });
  });

  it('requires manual selection when multiple methods cannot be inferred', () => {
    const journal = {
      id: 4,
      name: 'Mixed',
      journal_type: 'general',
      allowed_payment_methods: [{ code: 'cash' }, { code: 'bank_transfer' }],
    } as never;
    expect(inferPaymentMethodFromJournal(journal)).toEqual({ method: null, ambiguous: true });
    expect(needsManualPaymentMethodSelection(journal)).toBe(true);
  });
});
