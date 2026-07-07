import { describe, expect, it } from 'vitest';
import { resolveStudentHeaderFinancePaymentPresentation } from './resolve-student-header-finance-payment';

describe('resolveStudentHeaderFinancePaymentPresentation', () => {
  it('hides the action when finance is not visible or collect is not allowed', () => {
    expect(
      resolveStudentHeaderFinancePaymentPresentation({
        showFinance: false,
        canCollect: true,
      }).visible,
    ).toBe(false);
    expect(
      resolveStudentHeaderFinancePaymentPresentation({
        showFinance: true,
        canCollect: false,
      }).visible,
    ).toBe(false);
  });

  it('uses overdue tone when overdue balance exists', () => {
    const result = resolveStudentHeaderFinancePaymentPresentation({
      showFinance: true,
      canCollect: true,
      overviewFinance: {
        available: true,
        total_overdue: 1200,
        total_outstanding: 4500,
      },
    });
    expect(result.visible).toBe(true);
    expect(result.tone).toBe('overdue');
  });

  it('uses due tone when only outstanding balance exists', () => {
    const result = resolveStudentHeaderFinancePaymentPresentation({
      showFinance: true,
      canCollect: true,
      detailsFinance: {
        currency: { name: 'MAD', symbol: 'DH' },
        total_assessed: 10000,
        total_discount: 0,
        total_paid: 2000,
        total_outstanding: 8000,
        total_overdue: 0,
        next_due_date: null,
      },
    });
    expect(result.tone).toBe('due');
  });

  it('uses attention tone when finance status label signals review', () => {
    const result = resolveStudentHeaderFinancePaymentPresentation({
      showFinance: true,
      canCollect: true,
      overviewFinance: {
        available: true,
        total_overdue: 0,
        total_outstanding: 0,
        status_label: 'يتطلب مراجعة',
      },
    });
    expect(result.tone).toBe('attention');
  });
});
