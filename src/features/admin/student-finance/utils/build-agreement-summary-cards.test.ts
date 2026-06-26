import { describe, expect, it } from 'vitest';
import { buildAgreementSummaryCards } from './build-agreement-summary-cards';
import type { FinancialAgreement } from '../types';

const labels = {
  original: 'Original',
  discount: 'Discount',
  final: 'Final',
  recurring: 'Recurring',
  monthly: 'Monthly',
  schedule: 'Schedule',
  surcharge: 'Surcharge',
  net: 'Net',
  paid: 'Paid',
  remaining: 'Remaining',
};

describe('buildAgreementSummaryCards', () => {
  it('removes duplicate totals when final and schedule match original', () => {
    const cards = buildAgreementSummaryCards({
      financeSummary: {
        original_total: 26500,
        discount_total: 0,
        final_total: 26500,
        net_total: 26500,
        recurring_total_after_discount: 24000,
        monthly_due_amount: 2400,
        schedule_total: 26500,
      },
      agreement: { id: 1, student_id: 1743, state: 'active' } as FinancialAgreement,
      labels,
    });

    expect(cards.map((card) => card.key)).toEqual(['original', 'recurring', 'monthly']);
  });

  it('keeps discount when greater than zero', () => {
    const cards = buildAgreementSummaryCards({
      financeSummary: {
        original_total: 20000,
        discount_total: 500,
        final_total: 19500,
        net_total: 19500,
      },
      agreement: { id: 1, student_id: 1, state: 'active' } as FinancialAgreement,
      labels,
    });

    expect(cards.some((card) => card.key === 'discount')).toBe(true);
    expect(cards.some((card) => card.key === 'final')).toBe(true);
  });
});
