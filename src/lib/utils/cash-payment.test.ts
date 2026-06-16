import { describe, expect, it } from 'vitest';
import { isCashPayment, paymentMethodRequiresCashSession } from '@/lib/utils/cash-payment';

describe('cash payment detection', () => {
  it('detects cash by official code only', () => {
    expect(isCashPayment('cash')).toBe(true);
    expect(isCashPayment('cheque')).toBe(false);
    expect(isCashPayment('bank_transfer')).toBe(false);
    expect(isCashPayment('نقد')).toBe(false);
  });

  it('honors metadata requires_cash_session when present', () => {
    expect(paymentMethodRequiresCashSession('other', { requires_cash_session: true })).toBe(true);
    expect(paymentMethodRequiresCashSession('cash', { requires_cash_session: false })).toBe(false);
  });

  it('does not require session for cheque', () => {
    expect(paymentMethodRequiresCashSession('cheque')).toBe(false);
  });
});
