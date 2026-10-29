import { describe, expect, it } from 'vitest';
import { normalizeStudentFinancialOverview, normalizeCollectibleItemsResponse } from './normalize-student-financial-overview';

describe('normalizeStudentFinancialOverview', () => {
  it('distinguishes old API from explicit no future installments', () => {
    const input = {
      academic_year: { id: 1, name: '2026-2027' },
      totals: { annual_total: 1200, paid: 200, remaining: 1000, overdue: 200 },
      next_installment: { id: 1, remaining_amount: 200, due_date: '2026-09-05' },
    };
    const oldApi = normalizeStudentFinancialOverview(input);
    expect(oldApi?.next_future_installment).toBeUndefined();
    expect(oldApi?.next_installment?.due_date).toBe('2026-09-05');

    const noFuture = normalizeStudentFinancialOverview({
      ...input, business_today: '2026-10-29', next_future_installment: null,
    });
    expect(noFuture?.next_future_installment).toBeNull();

    const newApi = normalizeStudentFinancialOverview({
      ...input, business_today: '2026-10-29',
      next_future_installment: {
        id: 2, remaining_amount: 800, due_date: '2026-11-05', timing_status: 'hidden',
      },
    });
    expect(newApi?.business_today).toBe('2026-10-29');
    expect(newApi?.next_future_installment?.remaining_amount).toBe(800);
    expect(newApi?.next_future_installment?.timing_status).toBe('hidden');
  });

  it('preserves official due_to_date from backend', () => {
    const overview = normalizeStudentFinancialOverview({
      academic_year: { id: 1, name: '2025-2026' },
      totals: {
        currency: { name: 'MAD', symbol: 'DH' },
        annual_total: 22500,
        due_to_date: 4500,
        paid: 2000,
        remaining: 20500,
        overdue: 2500,
        upcoming: 16000,
      },
      counts: { fees_count: 2, installments_count: 11 },
      applied_plans: [],
    });
    expect(overview?.totals.due_to_date).toBe(4500);
    expect(overview?.academic_year.name).toBe('2025-2026');
  });

  it('classifies cleared, rejected_or_returned and cancelled cheque_summary buckets', () => {
    const overview = normalizeStudentFinancialOverview({
      academic_year: { id: 1, name: '2025-2026' },
      totals: {
        currency: { name: 'MAD', symbol: 'DH' },
        annual_total: 22500,
        paid_confirmed: 4500,
        remaining: 18000,
      },
      cheque_summary: {
        pending_count: 0,
        pending_amount: 0,
        settled_count: 1,
        settled_amount: 4500,
        rejected_count: 0,
        rejected_amount: 0,
        cancelled_count: 2,
        cancelled_amount: 9000,
        cleared: { count: 1, amount: 4500 },
        rejected_or_returned: { count: 0, amount: 0 },
        cancelled: { count: 2, amount: 9000 },
        cancelled_note: 'الشيكات الملغاة لا تُحسب كمرفوضة. راجع الأقساط لمعرفة المتبقي الفعلي.',
      },
    });

    expect(overview?.cheque_summary).toEqual({
      pending_count: 0,
      pending_amount: 0,
      settled_count: 1,
      settled_amount: 4500,
      rejected_count: 0,
      rejected_amount: 0,
      cancelled_count: 2,
      cancelled_amount: 9000,
      cancelled_note: 'الشيكات الملغاة لا تُحسب كمرفوضة. راجع الأقساط لمعرفة المتبقي الفعلي.',
    });
  });
});

describe('normalizeCollectibleItemsResponse', () => {
  it('filters fully paid and non-selectable items', () => {
    const response = normalizeCollectibleItemsResponse({
      summary: { annual_total: 22500, due_to_date: 4500, paid: 0, remaining: 22500, overdue: 0, upcoming: 18000 },
      items: [
        { installment_id: 1, remaining_amount: 2500, original_amount: 2500, paid_amount: 0, selectable: true },
        { installment_id: 2, remaining_amount: 0, original_amount: 2000, paid_amount: 2000, selectable: true },
        { installment_id: 3, remaining_amount: 1000, original_amount: 2000, paid_amount: 1000, selectable: false },
      ],
    });
    expect(response?.items).toHaveLength(1);
    expect(response?.items[0].installment_id).toBe(1);
  });
});
