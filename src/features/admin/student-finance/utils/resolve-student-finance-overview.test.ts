import { describe, expect, it } from 'vitest';
import { resolveStudentFinanceOverviewMetrics } from './resolve-student-finance-overview';

describe('resolveStudentFinanceOverviewMetrics', () => {
  it('maps official summary fields without inventing annual totals', () => {
    const metrics = resolveStudentFinanceOverviewMetrics({
      officialSummary: {
        academic_year: { id: 1, name: '2025-2026' },
        summary: {
          currency: { name: 'MAD', symbol: 'DH' },
          total_assessed: 22500,
          total_discount: 0,
          total_paid: 2000,
          total_outstanding: 20500,
          total_overdue: 2500,
          next_due_date: '2025-10-05',
        },
        billing_profile: null,
        financial_responsible: null,
        capabilities: {
          can_view: true,
          can_view_payments: true,
          can_collect: true,
          can_assign_fees: true,
          can_manage_discounts: false,
          can_approve_discounts: false,
          can_view_billing_profile: true,
          can_manage_billing_profile: true,
        },
      },
      workspace: {
        summary: { total_due: 22500, remaining: 20500, currency: { id: 1, name: 'MAD' } },
        upcoming_installments: [
          { id: 1, remaining_amount: 2000, amount: 2000, due_date: '2025-10-05', timing_status: 'upcoming' },
        ],
      } as never,
      installmentsSummary: { total_count: 11, total_amount: 22500 },
    });

    expect(metrics?.annual_total).toBe(22500);
    expect(metrics?.paid).toBe(2000);
    expect(metrics?.remaining).toBe(20500);
    expect(metrics?.overdue).toBe(2500);
    expect(metrics?.next_installment_amount).toBe(2000);
    expect(metrics?.next_installment_date).toBe('2025-10-05');
  });

  it('derives due-to-date from due installments when backend field is absent', () => {
    const metrics = resolveStudentFinanceOverviewMetrics({
      officialSummary: {
        academic_year: { id: 1, name: '2025-2026' },
        summary: {
          currency: { name: 'MAD', symbol: 'DH' },
          total_assessed: 22500,
          total_discount: 0,
          total_paid: 0,
          total_outstanding: 22500,
          total_overdue: 0,
          next_due_date: '2026-06-17',
        },
        billing_profile: null,
        financial_responsible: null,
        capabilities: {
          can_view: true,
          can_view_payments: true,
          can_collect: true,
          can_assign_fees: true,
          can_manage_discounts: false,
          can_approve_discounts: false,
          can_view_billing_profile: true,
          can_manage_billing_profile: true,
        },
      },
      workspace: {
        upcoming_installments: [
          { id: 1, remaining_amount: 2500, timing_status: 'due' },
          { id: 2, remaining_amount: 2000, timing_status: 'due' },
        ],
      } as never,
      installmentsSummary: null,
    });

    expect(metrics?.due_to_date).toBe(4500);
  });
});
