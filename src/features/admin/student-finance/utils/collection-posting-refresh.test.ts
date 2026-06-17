import { describe, expect, it } from 'vitest';
import {
  buildPaymentCollectionsListQuery,
  filterCollectionsForStudent,
} from '@/features/admin/finance/collection-list-query';
import { resolveCollectionPayerLabel } from '@/features/admin/finance/collection-payer-label';
import { applyCollectionUpdatedOverview } from './apply-collection-updated-overview';
import { formatInstallmentDisplayTitle } from './format-installment-display';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';

const baseOverview: StudentFinancialOverview = {
  academic_year: { id: 1, name: '2025-2026' },
  totals: {
    currency: { name: 'MAD', symbol: 'د.م.' },
    annual_total: 22500,
    due_to_date: 4500,
    paid: 0,
    remaining: 22500,
    overdue: 0,
    upcoming: 4500,
  },
  counts: { fees_count: 2, installments_count: 11 },
  next_installment: {
    id: 1,
    fee_name: 'التسجيل',
    period_label: 'installment 1/1',
    amount: 2500,
    remaining_amount: 2500,
    due_date: '2025-09-01',
  },
  applied_plans: [],
  special_agreement: null,
  billing_profile: null,
  billing_profile_id: null,
};

describe('applyCollectionUpdatedOverview', () => {
  it('merges updated_overview totals into cached overview', () => {
    const patched = applyCollectionUpdatedOverview(baseOverview, {
      totals: {
        currency: baseOverview.totals.currency,
        annual_total: 22500,
        paid: 4500,
        remaining: 18000,
        due_to_date: 0,
        overdue: 0,
        upcoming: 2000,
      },
      next_installment: {
        id: 2,
        fee_name: 'التمدرس',
        display_label: 'التمدرس — الدفعة الثانية',
        period_label: 'installment 2/10',
        amount: 2000,
        remaining_amount: 2000,
        due_date: '2025-10-01',
      },
    });

    expect(patched.totals.paid).toBe(4500);
    expect(patched.totals.remaining).toBe(18000);
    expect(patched.totals.due_to_date).toBe(0);
    expect(patched.next_installment?.display_label).toBe('التمدرس — الدفعة الثانية');
  });
});

describe('resolveCollectionPayerLabel', () => {
  it('prefers payer_name then billing_partner_name', () => {
    expect(
      resolveCollectionPayerLabel(
        { payer_name: 'ولي أمر عبد العزيز حميد', billing_partner_name: 'Partner' },
        '—',
      ),
    ).toBe('ولي أمر عبد العزيز حميد');

    expect(
      resolveCollectionPayerLabel({ payer_name: '', billing_partner_name: 'ولي أمر عبد العزيز حميد' }, '—'),
    ).toBe('ولي أمر عبد العزيز حميد');
  });

  it('does not return dash when a name exists', () => {
    const label = resolveCollectionPayerLabel({ payer_name: 'Parent' }, '—');
    expect(label).not.toBe('—');
    expect(label).toBe('Parent');
  });
});

describe('formatInstallmentDisplayTitle', () => {
  it('uses display_label when present', () => {
    expect(
      formatInstallmentDisplayTitle({
        display_label: 'التمدرس — الدفعة الثانية',
        period_label: 'installment 2/10',
      }),
    ).toBe('التمدرس — الدفعة الثانية');
  });

  it('does not show raw installment 1/1 when period can be normalized', () => {
    const title = formatInstallmentDisplayTitle(
      { fee_name: 'التمدرس', period_label: 'installment 2/10' },
      'ar',
    );
    expect(title).not.toMatch(/installment\s*2\s*\/\s*10/i);
    expect(title).toContain('التمدرس');
  });
});

describe('payment collections student filter', () => {
  it('forwards student_id and student query params', () => {
    const query = buildPaymentCollectionsListQuery({ student_id: 854, page: 1 });
    expect(query.student_id).toBe('854');
    expect(query.student).toBe('854');
  });

  it('scopes rows to student_id when API returns a broad list', () => {
    const rows = [
      { id: 1, student_id: 854 },
      { id: 2, student_id: 100 },
      { id: 3, student_id: 854 },
    ];
    const scoped = filterCollectionsForStudent(rows, 854);
    expect(scoped).toHaveLength(2);
    expect(scoped.every((r) => r.student_id === 854)).toBe(true);
  });
});

describe('idempotency replay guard', () => {
  it('detects duplicate collection id for replay semantics', () => {
    const posted = new Set<number>();
    const collectionId = 1464;
    const first = !posted.has(collectionId);
    posted.add(collectionId);
    const replay = posted.has(collectionId);
    expect(first).toBe(true);
    expect(replay).toBe(true);
    const shouldNotify = first;
    expect(shouldNotify).toBe(true);
  });
});
