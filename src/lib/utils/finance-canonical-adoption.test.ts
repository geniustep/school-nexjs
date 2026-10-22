import { describe, expect, it } from 'vitest';
import { parseFinanceCanonicalMetrics, parseFinanceCanonicalPeriodMetrics } from '@/lib/utils/finance-canonical';

const yearly = {
  meta: { school_id: 1, academic_year_id: 7, as_of_date: '2026-10-22', currency: { name: 'MAD' } },
  values: {
    academic_year_programmed_total: 400, due_to_date: 200,
    recognized_collected_to_date: 80, remaining_due_to_date: 120,
    overdue_amount: 20, future_scheduled_amount: 200, collection_rate_to_date: 40,
    stock_fee_paid: 120, future_due_paid: 40, remaining_balance: 280,
  },
  availability: {
    recognized_collected_to_date: { available: true },
    remaining_due_to_date: { available: true },
    overdue_amount: { available: true },
    collection_rate_to_date: { available: true },
  },
  data_quality: { historical_settlement_attribution_complete: true },
};
const period = {
  meta: { school_id: 1, academic_year_id: 7, date_from: '2026-10-01', date_to: '2026-10-22', as_of_date: '2026-10-22', currency: { name: 'MAD' } },
  values: { period_cash_collected: 250, all_confirmed_collections: 255, period_due_cohort_due: 200, period_due_cohort_paid: 150, period_due_cohort_collection_rate: 75 },
};
describe('canonical frontend adoption on main', () => {
  it('keeps stock, prepaid and recognized values separate', () => {
    const c = parseFinanceCanonicalMetrics(yearly, { schoolId: 1, academicYearId: 7 });
    expect(c?.values.stock_fee_paid).toBe(120);
    expect(c?.values.future_due_paid).toBe(40);
    expect(c?.values.recognized_collected_to_date).toBe(80);
  });
  it('does not equate report confirmed and standard treasury cash', () => {
    const c = parseFinanceCanonicalPeriodMetrics(period, { schoolId: 1, academicYearId: 7, dateFrom: '2026-10-01', dateTo: '2026-10-22' });
    expect(c?.values.all_confirmed_collections).toBe(255);
    expect(c?.values.period_cash_collected).toBe(250);
    expect(c?.values.period_due_cohort_paid).toBe(150);
  });
  it('preserves zeros but declines absent or stale contracts', () => {
    const zero = { ...period, values: { ...period.values, period_cash_collected: 0 } };
    expect(parseFinanceCanonicalPeriodMetrics(zero)?.values.period_cash_collected).toBe(0);
    expect(parseFinanceCanonicalPeriodMetrics({})).toBeNull();
    expect(parseFinanceCanonicalPeriodMetrics(period, { academicYearId: 8 })).toBeNull();
  });
  it('reads an old yearly contract without the three additive stock fields', () => {
    const old = Object.fromEntries(Object.entries(yearly.values).filter(([key]) => !['stock_fee_paid', 'remaining_balance', 'future_due_paid'].includes(key)));
    expect(parseFinanceCanonicalMetrics({ ...yearly, values: old })?.values.due_to_date).toBe(200);
  });
});
