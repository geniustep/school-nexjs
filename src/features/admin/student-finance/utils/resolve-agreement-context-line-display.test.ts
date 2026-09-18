import { describe, expect, it } from 'vitest';
import type { FinancialAgreement, FinancialAgreementLine } from '../types';
import {
  resolveAgreementContextCurrentTotal,
  resolveAgreementContextLineDisplay,
} from './resolve-agreement-context-line-display';

describe('agreement context current display', () => {
  it('uses the amended operational monthly price instead of the original line price', () => {
    const line: FinancialAgreementLine = {
      id: 10,
      commitment_type: 'renewable_subscription',
      pricing_unit: 'month',
      unit_price: 2000,
      schedule_period_count: 10,
      schedule_total: 19000,
      net_amount: 19000,
    };
    const installments = Array.from({ length: 10 }, (_, index) => ({
      id: 100 + index,
      agreement_line_id: 10,
      amount: 1900,
      state: 'planned',
    }));

    expect(resolveAgreementContextLineDisplay(line, installments)).toEqual({
      isOneTime: false,
      monthCount: 10,
      currentPrice: 1900,
      priceMin: 1900,
      priceMax: 1900,
      total: 19000,
    });
  });

  it('shows a current price range when amended months have different prices', () => {
    const line: FinancialAgreementLine = {
      id: 20,
      commitment_type: 'renewable_subscription',
      pricing_unit: 'month',
      unit_price: 2000,
      schedule_period_count: 3,
    };
    const display = resolveAgreementContextLineDisplay(line, [
      { id: 1, agreement_line_id: 20, amount: 2000 },
      { id: 2, agreement_line_id: 20, amount: 1800 },
      { id: 3, agreement_line_id: 20, amount: 1900 },
    ]);

    expect(display.currentPrice).toBeNull();
    expect(display.priceMin).toBe(1800);
    expect(display.priceMax).toBe(2000);
    expect(display.total).toBe(5700);
    expect(display.monthCount).toBe(3);
  });

  it('uses the amended operational amount for one-time registration', () => {
    const line: FinancialAgreementLine = {
      id: 30,
      commitment_type: 'one_time',
      pricing_unit: 'academic_year',
      unit_price: 2500,
      net_amount: 2500,
    };
    const display = resolveAgreementContextLineDisplay(line, [
      { id: 4, agreement_line_id: 30, amount: 2000 },
    ]);

    expect(display.isOneTime).toBe(true);
    expect(display.monthCount).toBeNull();
    expect(display.currentPrice).toBe(2000);
    expect(display.total).toBe(2000);
  });

  it('prefers the live schedule total for the agreement headline', () => {
    const agreement = {
      id: 99,
      student_id: 1,
      state: 'active',
      net_amount: 26000,
      schedule_summary: { total_amount: 24500 },
      financial_summary: { net_total: 24500 },
    } as FinancialAgreement;

    expect(resolveAgreementContextCurrentTotal(agreement, 26000)).toBe(24500);
  });
});
