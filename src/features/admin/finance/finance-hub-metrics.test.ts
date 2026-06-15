import { describe, expect, it } from 'vitest';
import {
  buildCollectionTrend,
  buildPaymentMethodSlices,
  buildReceivableStatusSlices,
  computeCollectionRate,
} from '@/features/admin/finance/finance-hub-chart-utils';
import {
  computeOverviewCollectionRate,
  filterConfirmedCollections,
  resolveOverviewSettledAmount,
  sumConfirmedCollectionAmount,
} from '@/features/admin/finance/finance-hub-metrics';
import { normalizeFinanceOverview } from '@/lib/utils/finance-normalize';
import type { PaymentCollection } from '@/types/finance';

/** Production-like fixture from school database audit (2026-06-15). */
const PRODUCTION_OVERVIEW = {
  total_due: 26898,
  confirmed_paid: 1400,
  remaining_amount: 25498,
  overdue_amount: 50,
  totals: {
    total_due: 26898,
    total_paid: 1400,
    total_remaining: 25498,
    total_overdue: 50,
    overdue_installments: 1,
  },
};

const PERIOD_COLLECTIONS = [
  { id: 1, amount: 100, state: 'cancelled', date: '2026-06-01', payment_method: 'cash' },
  { id: 2, amount: 500, state: 'draft', date: '2026-06-02', payment_method: 'cheque' },
  { id: 3, amount: 500, state: 'draft', date: '2026-06-03', payment_method: 'cheque' },
  { id: 4, amount: 100, state: 'confirmed', date: '2026-06-05', payment_method: 'cash' },
  { id: 5, amount: 2950, state: 'confirmed', date: '2026-06-10', payment_method: 'cheque' },
] as PaymentCollection[];

describe('finance hub metrics contract', () => {
  it('resolves settled amount from nested totals.total_paid when total_collected is absent', () => {
    const overview = normalizeFinanceOverview(PRODUCTION_OVERVIEW);
    expect(resolveOverviewSettledAmount(overview?.totals)).toBe(1400);
  });

  it('keeps KPI settled amount aligned with collection rate numerator', () => {
    const overview = normalizeFinanceOverview(PRODUCTION_OVERVIEW);
    const settled = resolveOverviewSettledAmount(overview?.totals);
    const rate = computeOverviewCollectionRate(overview?.totals);
    expect(settled).toBe(1400);
    expect(rate).toBeCloseTo(5.2, 1);
    expect(computeCollectionRate(overview)).toBe(rate);
  });

  it('uses the same settled amount for donut paid slice', () => {
    const overview = normalizeFinanceOverview(PRODUCTION_OVERVIEW);
    const slices = buildReceivableStatusSlices(overview);
    expect(slices.find((slice) => slice.key === 'paid')?.amount).toBe(1400);
  });

  it('does not treat raw period sum 4150 as confirmed collections', () => {
    const rawSum = PERIOD_COLLECTIONS.reduce((sum, row) => sum + (row.amount ?? 0), 0);
    expect(rawSum).toBe(4150);
    const confirmedSum = sumConfirmedCollectionAmount(PERIOD_COLLECTIONS);
    expect(confirmedSum).toBe(3050);
    expect(confirmedSum).not.toBe(rawSum);
  });

  it('excludes draft and cancelled rows from trend and payment method charts', () => {
    const trend = buildCollectionTrend(PERIOD_COLLECTIONS, '2026-06-01', '2026-06-15');
    expect(sumConfirmedCollectionAmount(PERIOD_COLLECTIONS)).toBe(
      trend.reduce((sum, point) => sum + point.amount, 0),
    );
    const methods = buildPaymentMethodSlices(PERIOD_COLLECTIONS);
    expect(methods.reduce((sum, slice) => sum + slice.amount, 0)).toBe(3050);
    expect(filterConfirmedCollections(PERIOD_COLLECTIONS)).toHaveLength(2);
  });

  it('enriches nested overview totals without field mismatch zero', () => {
    const overview = normalizeFinanceOverview(PRODUCTION_OVERVIEW);
    expect(overview?.totals?.total_collected).toBe(1400);
    expect(overview?.totals?.confirmed_paid).toBe(1400);
  });
});
