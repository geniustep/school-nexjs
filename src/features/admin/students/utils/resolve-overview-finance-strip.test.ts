import { describe, expect, it } from 'vitest';
import { resolveOverviewFinanceStripPresentation } from './resolve-overview-finance-strip';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';

function overview(partial: Partial<StudentFinancialOverview['totals']>): StudentFinancialOverview {
  return {
    totals: {
      annual_total: 0,
      due_to_date: 0,
      paid: 0,
      paid_confirmed: 0,
      pending_cheque: 0,
      covered_total: 0,
      remaining: 0,
      overdue: 0,
      upcoming: 0,
      currency: { name: 'MAD' },
      ...partial,
    },
  } as StudentFinancialOverview;
}

describe('resolveOverviewFinanceStripPresentation', () => {
  it('computes paid percent from API totals', () => {
    const result = resolveOverviewFinanceStripPresentation({
      financialOverview: overview({
        annual_total: 20000,
        paid_confirmed: 5000,
        remaining: 15000,
        overdue: 0,
      }),
    });
    expect(result?.paidPercent).toBe(25);
    expect(result?.tone).toBe('progress');
    expect(result?.activeStage).toBe('paying');
  });

  it('marks overdue tone when overdue amount exists', () => {
    const result = resolveOverviewFinanceStripPresentation({
      financialOverview: overview({
        annual_total: 16000,
        paid_confirmed: 0,
        remaining: 16000,
        overdue: 1000,
      }),
    });
    expect(result?.tone).toBe('overdue');
    expect(result?.activeStage).toBe('overdue');
  });

  it('marks complete when remaining is cleared', () => {
    const result = resolveOverviewFinanceStripPresentation({
      financialOverview: overview({
        annual_total: 10000,
        paid_confirmed: 10000,
        remaining: 0,
        overdue: 0,
      }),
    });
    expect(result?.tone).toBe('complete');
    expect(result?.paidPercent).toBe(100);
  });
});
