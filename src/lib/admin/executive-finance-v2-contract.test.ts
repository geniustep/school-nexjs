import { describe, expect, it } from 'vitest';
import { financeV2Query, readExecutiveFinanceV2, readFinanceV2Metric } from './executive-finance-v2-contract';

const money = (n: number | null, available = true, reason_code: string | null = null) =>
  ({ available, amount: n, reason_code });
function fixture() {
  return {
    version: 'executive-finance-v2', source: 'odoo.executive_finance_v2',
    meta: { school_id: 3, academic_year_id: 8, academic_year_name: '2026-2027',
      currency: { name: 'MAD', symbol: 'د.م.', decimal_places: 2 },
      period: { scope: 'current_month', date_from: '2026-10-01', date_to: '2026-10-19' } },
    indicators: {
      period_net_due: money(1200), period_actual_collections: money(0),
      due_cohort_performance: { available: true, due_amount: 1200,
        recognized_collected_amount: 400, remaining_on_due_cohort: 800, collection_rate: 33.33 },
      remaining_balance: money(800), overdue_outstanding: money(300),
      overdue_billing_accounts_count: { available: true, count: 2 },
    },
    comparison_previous_period: { available: false, reason_code: 'previous_period_span_not_symmetric', period: null, indicators: null },
    unavailable_metrics: { paid_expenses: { available: false, reason_code: 'expense_payment_cycle_not_implemented' } },
  };
}

describe('Odoo Executive Finance V2 contract adoption', () => {
  it('keeps missing or RBAC null V2 unavailable rather than synthesizing zero', () => {
    expect(readExecutiveFinanceV2(null)).toBeNull();
    expect(readExecutiveFinanceV2(undefined)).toBeNull();
    expect(readExecutiveFinanceV2({ finance_summary: { collected_month: 4 } })).toBeNull();
  });
  it('preserves real zero as available, and never promotes null amount', () => {
    expect(readFinanceV2Metric(money(0))).toEqual({ available: true, amount: 0, reason_code: null });
    expect(readFinanceV2Metric(money(null))).toEqual({ available: false, amount: null, reason_code: 'metric_unavailable' });
    expect(readFinanceV2Metric(money(19, false, 'historical_stock_snapshot_not_available'))).toEqual({
      available: false, amount: null, reason_code: 'historical_stock_snapshot_not_available',
    });
  });
  it('reads Due/Cash/Cohort/Stock separately and does not invent paid expenses', () => {
    const b = readExecutiveFinanceV2(fixture());
    expect(b?.indicators?.period_net_due.amount).toBe(1200);
    expect(b?.indicators?.period_actual_collections.amount).toBe(0);
    expect(b?.indicators?.due_cohort_performance.recognized_collected_amount).toBe(400);
    expect(b?.indicators?.overdue_billing_accounts_count.count).toBe(2);
    expect(b?.unavailable_metrics.paid_expenses?.available).toBe(false);
  });
  it('keeps non-symmetric comparison explicitly unavailable', () => {
    const b = readExecutiveFinanceV2(fixture());
    expect(b?.comparison_previous_period?.available).toBe(false);
    expect(b?.comparison_previous_period?.reason_code).toBe('previous_period_span_not_symmetric');
    expect(b?.comparison_previous_period?.indicators).toBeNull();
  });
  it('does not show historical stock even with available period flow comparison', () => {
    const f = fixture();
    const priorIndicators = JSON.parse(JSON.stringify(f.indicators));
    priorIndicators.remaining_balance = money(null, false, 'historical_stock_snapshot_not_available');
    priorIndicators.overdue_outstanding = money(null, false, 'historical_stock_snapshot_not_available');
    priorIndicators.overdue_billing_accounts_count = { available: false, count: null, reason_code: 'historical_stock_snapshot_not_available' };
    f.comparison_previous_period = { available: true, reason_code: null as unknown as string,
      period: { scope: 'current_month', date_from: '2026-09-01', date_to: '2026-09-19' } as unknown as null,
      indicators: priorIndicators as unknown as null };
    const b = readExecutiveFinanceV2(f);
    expect(b?.comparison_previous_period?.available).toBe(true);
    expect(b?.comparison_previous_period?.indicators?.remaining_balance.available).toBe(false);
    expect(b?.comparison_previous_period?.indicators?.overdue_billing_accounts_count.count).toBeNull();
  });
  it('annual scope does not invent prior academic year history', () => {
    const f = fixture();
    f.meta.period.scope = 'academic_year';
    f.comparison_previous_period.reason_code = 'academic_year_period_comparison_not_supported';
    const b = readExecutiveFinanceV2(f);
    expect(b?.meta.period.scope).toBe('academic_year');
    expect(b?.comparison_previous_period?.available).toBe(false);
  });
  it('sends the period choice without overriding academic-year/session parameters', () => {
    expect(financeV2Query('current_month')).toEqual({ finance_period_scope: 'current_month' });
    expect(financeV2Query('academic_year')).toEqual({ finance_period_scope: 'academic_year' });
  });
});
