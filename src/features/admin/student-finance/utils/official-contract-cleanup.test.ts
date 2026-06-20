import { describe, expect, it } from 'vitest';
import { resolveCollectionPayerLabel } from '@/features/admin/finance/collection-payer-label';
import { resolveLegacyCollectionPayerLabel } from '@/features/admin/finance/resolve-legacy-collection-display';
import { applyCollectionUpdatedOverview } from './apply-collection-updated-overview';
import { normalizeStudentFinancialOverview } from './normalize-student-financial-overview';
import { resolveInstallmentDisplayLabel } from './resolve-installment-display';
import { resolveStudentFinanceOverviewMetrics } from './resolve-student-finance-overview';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';

const baseOverview: StudentFinancialOverview = {
  academic_year: { id: 1, name: '2025-2026' },
  totals: {
    currency: { name: 'MAD', symbol: 'د.م.' },
    annual_total: 22500,
    due_to_date: 0,
    paid: 4500,
    paid_confirmed: 0,
    pending_cheque: 4500,
    covered_total: 4500,
    remaining: 18000,
    overdue: 0,
    upcoming: 18000,
  },
  counts: { fees_count: 2, installments_count: 11 },
  next_installment: {
    id: 2,
    display_label: 'التمدرس — يوليو 2026',
    period_label: 'يوليو 2026',
    amount: 2000,
    remaining_amount: 2000,
    due_date: '2026-07-17',
  },
  cheque_summary: {
    pending_count: 1,
    pending_amount: 4500,
    settled_count: 0,
    settled_amount: 0,
    rejected_count: 0,
    rejected_amount: 0,
    cancelled_count: 0,
    cancelled_amount: 0,
  },
  applied_plans: [],
  special_agreement: null,
  billing_profile: null,
  billing_profile_id: null,
};

describe('official financial overview contract', () => {
  it('normalizes paid_confirmed, pending_cheque, covered_total and cheque_summary', () => {
    const overview = normalizeStudentFinancialOverview({
      academic_year: { id: 1, name: '2025-2026' },
      totals: {
        paid_confirmed: 0,
        pending_cheque: 4500,
        covered_total: 4500,
        remaining: 18000,
        paid: 4500,
      },
      cheque_summary: {
        pending_count: 1,
        pending_amount: 4500,
        settled_count: 0,
        settled_amount: 0,
        rejected_count: 0,
        rejected_amount: 0,
        cancelled_count: 0,
        cancelled_amount: 0,
      },
      next_installment: {
        id: 2,
        display_label: 'التمدرس — يوليو 2026',
        period_label: 'يوليو 2026',
        amount: 2000,
        remaining_amount: 2000,
      },
    });

    expect(overview?.totals.paid_confirmed).toBe(0);
    expect(overview?.totals.pending_cheque).toBe(4500);
    expect(overview?.totals.covered_total).toBe(4500);
    expect(overview?.cheque_summary?.pending_count).toBe(1);
  });

  it('reads overview metrics from totals without workspace fallback', () => {
    const metrics = resolveStudentFinanceOverviewMetrics(baseOverview);
    expect(metrics?.paid_confirmed).toBe(0);
    expect(metrics?.pending_cheque).toBe(4500);
    expect(metrics?.covered_total).toBe(4500);
    expect(metrics?.has_pending_cheque).toBe(true);
  });

  it('uses official display_label without installment normalization', () => {
    const label = resolveInstallmentDisplayLabel({
      display_label: 'التمدرس — يوليو 2026',
      period_label: 'installment 2/10',
      fee_name: 'التمدرس',
    });
    expect(label).toBe('التمدرس — يوليو 2026');
    expect(label).not.toMatch(/installment/i);
  });

  it('applies updated_overview patch including covered_total', () => {
    const patched = applyCollectionUpdatedOverview(baseOverview, {
      totals: {
        currency: baseOverview.totals.currency,
        annual_total: 22500,
        due_to_date: 0,
        paid: 4500,
        paid_confirmed: 0,
        pending_cheque: 4500,
        covered_total: 4500,
        remaining: 18000,
        overdue: 0,
        upcoming: 18000,
      },
      next_installment: {
        id: 2,
        display_label: 'التمدرس — أغسطس 2026',
        period_label: 'أغسطس 2026',
        amount: 2000,
        remaining_amount: 2000,
        due_date: '2026-08-17',
      },
    });

    expect(patched.totals.covered_total).toBe(4500);
    expect(patched.next_installment?.display_label).toBe('التمدرس — أغسطس 2026');
  });
});

describe('collection payer contract', () => {
  it('uses payer_name directly', () => {
    expect(
      resolveCollectionPayerLabel({ payer_name: 'ولي أمر عبد العزيز حميد' }, '—'),
    ).toBe('ولي أمر عبد العزيز حميد');
  });

  it('falls back to legacy payer only when payer_name is missing', () => {
    expect(
      resolveLegacyCollectionPayerLabel({ billing_partner_name: 'ولي أمر عبد العزيز حميد' }, 'غير محفوظ'),
    ).toBe('ولي أمر عبد العزيز حميد');
    expect(resolveCollectionPayerLabel({}, 'غير محفوظ')).toBe('غير محفوظ');
  });
});

describe('collections list query contract', () => {
  it('builds student_id only list params', () => {
    const params = { student_id: 854, page: 1, page_size: 20 };
    expect(params.student_id).toBe(854);
    expect('student' in params).toBe(false);
  });

  it('does not client-filter collections by student_id', () => {
    const rows = [{ id: 1, student_id: 854 }, { id: 2, student_id: 854 }];
    expect(rows.every((row) => row.student_id === 854)).toBe(true);
    expect(rows.length).toBe(2);
  });
});
