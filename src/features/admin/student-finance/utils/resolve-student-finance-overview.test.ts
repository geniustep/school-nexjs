import { describe, expect, it } from 'vitest';
import { resolveStudentFinanceOverviewMetrics } from './resolve-student-finance-overview';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';

const sampleOverview: StudentFinancialOverview = {
  academic_year: { id: 1, name: '2025-2026' },
  totals: {
    currency: { name: 'MAD', symbol: 'DH' },
    annual_total: 22500,
    due_to_date: 4500,
    paid: 2000,
    paid_confirmed: 2000,
    pending_cheque: 0,
    covered_total: 2000,
    remaining: 20500,
    overdue: 2500,
    upcoming: 16000,
  },
  counts: { fees_count: 2, installments_count: 11 },
  next_installment: {
    id: 1001,
    fee_name: 'التسجيل',
    period_label: '2025-2026',
    amount: 2500,
    remaining_amount: 2500,
    due_date: '2025-10-05',
    display_state: 'due',
  },
  cheque_summary: null,
  applied_plans: [],
  special_agreement: null,
  billing_profile: null,
};

describe('resolveStudentFinanceOverviewMetrics', () => {
  it('uses official financial-overview totals without local derivation', () => {
    const metrics = resolveStudentFinanceOverviewMetrics(sampleOverview);
    expect(metrics?.annual_total).toBe(22500);
    expect(metrics?.due_to_date).toBe(4500);
    expect(metrics?.paid).toBe(2000);
    expect(metrics?.remaining).toBe(20500);
    expect(metrics?.overdue).toBe(2500);
    expect(metrics?.upcoming).toBe(16000);
    expect(metrics?.fees_count).toBe(2);
    expect(metrics?.installments_count).toBe(11);
    expect(metrics?.next_installment_amount).toBe(2500);
    expect(metrics?.next_installment_date).toBe('2025-10-05');
  });

  it('returns null when overview is missing', () => {
    expect(resolveStudentFinanceOverviewMetrics(null)).toBeNull();
  });
});
