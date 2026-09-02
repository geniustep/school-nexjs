import { describe, expect, it } from 'vitest';
import {
  highestOverdueService,
  lowestCollectionService,
  resolveInstallmentPerformance,
  timelineWindow,
} from '@/features/admin/finance/installments-analytics-utils';
import type {
  FinanceInstallmentServiceFacet,
  FinanceInstallmentTimelinePoint,
} from '@/types/finance';

const facets: FinanceInstallmentServiceFacet[] = [
  {
    service_id: 1,
    service_name: 'Tuition',
    count: 10,
    total_amount: 1000,
    total_paid: 700,
    total_remaining: 300,
    total_expected: 200,
    total_overdue: 100,
    collection_rate: 70,
  },
  {
    service_id: 2,
    service_name: 'Transport',
    count: 8,
    total_amount: 800,
    total_paid: 320,
    total_remaining: 480,
    total_expected: 180,
    total_overdue: 300,
    collection_rate: 40,
  },
];

describe('installments analytics presentation', () => {
  it('uses authoritative analytics fields when present', () => {
    expect(resolveInstallmentPerformance(facets[0])).toEqual({
      totalAmount: 1000,
      paidAmount: 700,
      expectedAmount: 200,
      overdueAmount: 100,
      remainingAmount: 300,
      collectionRate: 70,
    });
  });

  it('keeps a backward-compatible decomposition for the 351 contract', () => {
    expect(
      resolveInstallmentPerformance({
        service_id: 3,
        service_name: 'Books',
        count: 2,
        total_remaining: 120,
        total_overdue: 20,
      }),
    ).toEqual({
      totalAmount: 120,
      paidAmount: 0,
      expectedAmount: 100,
      overdueAmount: 20,
      remainingAmount: 120,
      collectionRate: 0,
    });
  });

  it('selects attention services from server-backed aggregates', () => {
    expect(highestOverdueService(facets)?.service_id).toBe(2);
    expect(lowestCollectionService(facets)?.service_id).toBe(2);
  });

  it('keeps the latest bounded due-month window', () => {
    const timeline = Array.from({ length: 10 }, (_, index) => ({
      period: `2026-${String(index + 1).padStart(2, '0')}`,
      installment_count: 1,
      total_amount: 100,
      total_paid: 50,
      total_remaining: 50,
      total_expected: 50,
      total_overdue: 0,
      collection_rate: 50,
    })) satisfies FinanceInstallmentTimelinePoint[];
    expect(timelineWindow(timeline, 4).map((item) => item.period)).toEqual([
      '2026-07', '2026-08', '2026-09', '2026-10',
    ]);
  });
});
