import { describe, expect, it } from 'vitest';
import { buildChequeTransitionSummary } from './cheque-transition-summary';
import type { FinanceCheque } from '@/types/finance';

describe('buildChequeTransitionSummary', () => {
  it('builds deposit summary from cheque detail fields', () => {
    const cheque = {
      id: 399,
      cheque_number: '123456',
      amount: 4500,
      currency: 'MAD',
      student_name: 'عبد العزيز حميد',
      holder_name: 'زكر',
      state: 'received',
    } as FinanceCheque;

    const summary = buildChequeTransitionSummary(cheque);
    expect(summary.chequeNumber).toBe('123456');
    expect(summary.amount).toBe(4500);
    expect(summary.currency).toBe('MAD');
    expect(summary.partyName).toBe('عبد العزيز حميد');
    expect(summary.currentState).toBe('received');
  });

  it('falls back to payer when student name is missing', () => {
    const cheque = {
      id: 400,
      cheque_number: '999',
      amount: 1000,
      holder_name: 'ولي الأمر',
      state: 'received',
    } as FinanceCheque;

    const summary = buildChequeTransitionSummary(cheque);
    expect(summary.partyName).toBe('ولي الأمر');
  });
});
