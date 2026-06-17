import { describe, expect, it } from 'vitest';
import { applyCollectionUpdatedOverview } from './apply-collection-updated-overview';
import { resolveStudentFinanceCurrency } from './resolve-student-finance-currency';
import { resolveStudentFinanceOverviewMetrics } from './resolve-student-finance-overview';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';

const baseOverview: StudentFinancialOverview = {
  academic_year: { id: 1, name: '2025-2026' },
  totals: {
    currency: { name: 'MAD', symbol: 'د.م.' },
    annual_total: 22500,
    due_to_date: 4500,
    paid: 0,
    paid_confirmed: 0,
    pending_cheque: 0,
    covered_total: 0,
    remaining: 22500,
    overdue: 0,
    upcoming: 22500,
  },
  counts: { fees_count: 2, installments_count: 11 },
  next_installment: {
    id: 1,
    display_label: 'التمدرس — يوليو 2026',
    amount: 2000,
    remaining_amount: 2000,
    due_date: '2026-07-17',
  },
  cheque_summary: null,
  applied_plans: [],
  special_agreement: null,
  billing_profile: null,
  billing_profile_id: null,
};

describe('student finance currency render safety', () => {
  it('resolves currency from overview totals', () => {
    expect(resolveStudentFinanceCurrency({ financialOverview: baseOverview })).toBe('MAD');
  });

  it('falls back to MAD when overview is missing', () => {
    expect(resolveStudentFinanceCurrency({ financialOverview: null })).toBe('MAD');
  });

  it('falls back to workspace summary currency', () => {
    expect(
      resolveStudentFinanceCurrency({
        workspaceSummary: {
          currency: { name: 'EUR', symbol: '€' },
        },
      }),
    ).toBe('EUR');
  });

  it('does not throw when overview totals.currency is missing during metrics resolve', () => {
    const broken = {
      ...baseOverview,
      totals: { ...baseOverview.totals, currency: undefined as unknown as StudentFinancialOverview['totals']['currency'] },
    };
    expect(() => resolveStudentFinanceOverviewMetrics(broken)).not.toThrow();
    expect(resolveStudentFinanceOverviewMetrics(broken)?.currency).toBe('MAD');
  });

  it('applies partial updated_overview without totals', () => {
    expect(() =>
      applyCollectionUpdatedOverview(baseOverview, {
        counts: { fees_count: 3 },
      }),
    ).not.toThrow();
    const patched = applyCollectionUpdatedOverview(baseOverview, { counts: { fees_count: 3 } });
    expect(patched.totals.currency.name).toBe('MAD');
    expect(patched.counts.fees_count).toBe(3);
  });

  it('applies partial totals without currency and keeps previous currency', () => {
    const patched = applyCollectionUpdatedOverview(baseOverview, {
      totals: {
        paid_confirmed: 2500,
        pending_cheque: 0,
        covered_total: 2500,
        remaining: 20000,
      },
    });
    expect(patched.totals.currency.name).toBe('MAD');
    expect(patched.totals.paid_confirmed).toBe(2500);
    expect(patched.totals.remaining).toBe(20000);
  });

  it('ignores null totals patch without crashing', () => {
    expect(() =>
      applyCollectionUpdatedOverview(baseOverview, { totals: null }),
    ).not.toThrow();
    expect(applyCollectionUpdatedOverview(baseOverview, { totals: null }).totals.currency.name).toBe(
      'MAD',
    );
  });

  it('ignores undefined totals patch without crashing', () => {
    expect(() =>
      applyCollectionUpdatedOverview(baseOverview, {
        totals: undefined,
        next_installment: null,
      }),
    ).not.toThrow();
  });

  it('resolveStudentFinanceCurrency never returns undefined string', () => {
    const code = resolveStudentFinanceCurrency({
      financialOverview: {
        ...baseOverview,
        totals: { ...baseOverview.totals, currency: undefined as unknown as StudentFinancialOverview['totals']['currency'] },
      },
    });
    expect(code).toBe('MAD');
    expect(code).not.toBe('undefined');
  });
});
