import { describe, expect, it } from 'vitest';
import { buildFinanceHubAttentionItems } from '@/features/admin/finance/finance-hub-attention-utils';
import {
  buildCollectionTrend,
  buildPaymentMethodSlices,
  buildReceivableStatusSlices,
  computeCollectionRate,
  sumInstallmentRemaining,
} from '@/features/admin/finance/finance-hub-chart-utils';
import {
  collectionTrendBucketMode,
  periodSpanDays,
  resolveFinanceHubPeriod,
} from '@/features/admin/finance/finance-hub-period';
import { normalizeFinanceOverview } from '@/lib/utils/finance-normalize';
import type { PaymentCollection } from '@/types/finance';

describe('finance hub period', () => {
  it('resolves last 30 days preset', () => {
    const range = resolveFinanceHubPeriod(
      { period: 'last_30_days', yearId: '', dateFrom: '', dateTo: '' },
      new Date('2026-06-15T12:00:00Z'),
    );
    expect(range.dateFrom).toBe('2026-05-16');
    expect(range.dateTo).toBe('2026-06-15');
  });

  it('chooses daily buckets for short ranges', () => {
    expect(collectionTrendBucketMode(30)).toBe('day');
    expect(collectionTrendBucketMode(120)).toBe('week');
    expect(collectionTrendBucketMode(200)).toBe('month');
    expect(periodSpanDays('2026-06-01', '2026-06-15')).toBe(15);
  });
});

describe('finance hub chart utils', () => {
  const collections = [
    { id: 1, amount: 100, date: '2026-06-10', payment_method: 'cash' },
    { id: 2, amount: 200, date: '2026-06-12', payment_method: 'cheque' },
  ] as PaymentCollection[];

  it('builds collection trend from real rows', () => {
    const trend = buildCollectionTrend(collections, '2026-06-01', '2026-06-15');
    expect(trend).toHaveLength(2);
    expect(trend.reduce((sum, point) => sum + point.amount, 0)).toBe(300);
  });

  it('builds receivable slices without inventing values', () => {
    const overview = normalizeFinanceOverview({
      total_due: 1000,
      confirmed_paid: 400,
      remaining_amount: 600,
      overdue_amount: 50,
    });
    const slices = buildReceivableStatusSlices(overview);
    expect(slices.find((slice) => slice.key === 'paid')?.amount).toBe(400);
    expect(slices.find((slice) => slice.key === 'due')?.amount).toBe(550);
    expect(slices.find((slice) => slice.key === 'overdue')?.amount).toBe(50);
  });

  it('computes collection rate only when due is positive', () => {
    const overview = normalizeFinanceOverview({ total_due: 1000, confirmed_paid: 250 });
    expect(computeCollectionRate(overview)).toBe(25);
    expect(computeCollectionRate(normalizeFinanceOverview({ total_due: 0, confirmed_paid: 0 }))).toBeNull();
  });

  it('aggregates payment methods from collections list', () => {
    const slices = buildPaymentMethodSlices(collections);
    expect(slices).toHaveLength(2);
    expect(slices.find((slice) => slice.code === 'cash')?.amount).toBe(100);
  });

  it('sums upcoming installment remaining in date window', () => {
    const result = sumInstallmentRemaining(
      [
        { due_date: '2026-06-20', remaining_amount: 100 },
        { due_date: '2026-07-01', remaining_amount: 200 },
      ],
      '2026-06-15',
      '2026-06-30',
    );
    expect(result.count).toBe(1);
    expect(result.amount).toBe(100);
  });
});

describe('finance hub attention', () => {
  it('returns empty alerts when no issues exist', () => {
    const overview = normalizeFinanceOverview({
      total_due: 1000,
      confirmed_paid: 1000,
      remaining_amount: 0,
      overdue_amount: 0,
      cheques: { received: 0, bounced: 0, overdue: 0 },
    });
    expect(
      buildFinanceHubAttentionItems({
        overview,
        rejectedChequeCount: 0,
        bouncedChequeCount: 0,
        draftCollectionsCount: 0,
        chequesDueSoonCount: 0,
        chequesDueSoonAmount: 0,
      }),
    ).toHaveLength(0);
  });

  it('includes overdue installments and draft collections', () => {
    const overview = normalizeFinanceOverview({
      overdue_installments_count: 2,
      overdue_amount: 150,
      draft_agreements_count: 1,
      uncovered_amount: 500,
      students_with_balance: 3,
    });
    const alerts = buildFinanceHubAttentionItems({
      overview,
      rejectedChequeCount: 0,
      bouncedChequeCount: 0,
      draftCollectionsCount: 2,
      chequesDueSoonCount: 0,
      chequesDueSoonAmount: 0,
    });
    expect(alerts.some((alert) => alert.key === 'overdue_installments')).toBe(true);
    expect(alerts.some((alert) => alert.key === 'draft_collections')).toBe(true);
    expect(alerts.some((alert) => alert.key === 'uncovered_amount')).toBe(true);
  });
});

describe('finance hub page contract', () => {
  it('does not render recent collections panel on dashboard page', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const pagePath = path.resolve('src/app/admin/finance/page.tsx');
    const source = fs.readFileSync(pagePath, 'utf8');
    expect(source.includes('FinanceOverviewPanel')).toBe(false);
    expect(source.includes('recentCollections')).toBe(false);
    expect(source.includes('FinanceHubCharts')).toBe(true);
    expect(source.includes('FinanceHubAlerts')).toBe(true);
  });
});
