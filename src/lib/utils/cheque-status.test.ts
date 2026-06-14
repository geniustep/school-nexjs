import { describe, expect, it } from 'vitest';
import {
  CHEQUE_QUICK_REJECTED,
  normalizeChequeStatus,
  rejectedChequeListApiState,
  rejectedChequeQuickHref,
  totalRejectedChequeCount,
} from '@/lib/utils/cheque-status';

describe('cheque status normalization', () => {
  it('maps bounced and returned aliases to rejected bucket', () => {
    expect(normalizeChequeStatus('bounced')).toBe('rejected');
    expect(normalizeChequeStatus('returned_to_payer')).toBe('rejected');
    expect(normalizeChequeStatus('rejected')).toBe('rejected');
    expect(normalizeChequeStatus('deposited')).toBe('deposited');
  });

  it('sums rejected and bounced counts for dashboard parity', () => {
    expect(totalRejectedChequeCount(2, 0)).toBe(2);
    expect(totalRejectedChequeCount(0, 2)).toBe(2);
    expect(totalRejectedChequeCount(1, 1)).toBe(2);
  });

  it('picks list API state when rejected records are stored as bounced', () => {
    expect(rejectedChequeListApiState(0, 2)).toBe('bounced');
    expect(rejectedChequeListApiState(2, 0)).toBe('rejected');
  });

  it('uses canonical quick filter href', () => {
    expect(rejectedChequeQuickHref()).toBe(`/admin/finance/cheques?quick=${CHEQUE_QUICK_REJECTED}`);
  });
});
