import { describe, expect, it } from 'vitest';
import type { FinancialAgreement, FinancialAgreementLine } from '../types';
import {
  resolveAgreementContextCurrentTotal,
  resolveAgreementContextLineDisplay,
  resolveAgreementSchedulePrices,
  resolveAgreementPeriodPrices,
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

  it('shows operational rate groups without replacing the historical line price', () => {
    const installments = Array.from({ length: 10 }, (_, index) => ({
      id: 100 + index,
      agreement_line_id: 20,
      period_start: new Date(Date.UTC(2026, 8 + index, 1)).toISOString().slice(0, 10),
      amount: index < 3 ? 800 : 1000,
      state: 'planned',
    }));
    const result = resolveAgreementSchedulePrices(20, installments);
    expect(result.groups).toEqual([{ amount: 800, count: 3 }, { amount: 1000, count: 7 }]);
    expect(result.periods.reduce((sum, period) => sum + period.amount, 0)).toBe(9400);
    expect(result.periods).toHaveLength(10);
  });

  it('never invents monthly rates for missing, ambiguous or cancelled schedule rows', () => {
    const prices = resolveAgreementPeriodPrices(20, [
      { id: 1, agreement_line_id: 20, period_start: '2026-10-01', amount: 800 },
      { id: 2, agreement_line_id: 20, period_start: '2026-11-01', amount: 800 },
      { id: 3, agreement_line_id: 20, period_start: '2026-11-01', amount: 1000 },
      { id: 4, agreement_line_id: 20, period_start: '2026-12-01', amount: 200, state: 'cancelled' },
    ], [
      { id: 10, periodStart: '2026-10-01' },
      { id: 11, periodStart: '2026-11-01' },
      { id: 12, periodStart: '2026-12-01' },
    ]);
    expect(prices).toEqual({ '10': 800 });
  });

  it('ignores historical/cancelled installments when describing operational prices', () => {
    const prices = resolveAgreementSchedulePrices(30, [
      { id: 1, agreement_line_id: 30, amount: 1000, state: 'planned' },
      { id: 2, agreement_line_id: 30, amount: 400, state: 'cancelled' },
      { id: 3, agreement_line_id: 99, amount: 2000, state: 'planned' },
    ]);
    expect(prices.groups).toEqual([{ amount: 1000, count: 1 }]);
  });
});
