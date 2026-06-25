import { describe, expect, it } from 'vitest';
import { buildBillingAccountCollectHref } from '@/lib/utils/normalize-billing-account';
import {
  readCollectionNewParams,
  resolveBillingCollectionStudentSelection,
  resolveEffectiveSelectedStudentId,
  shouldUseBillingAccountStudentSelector,
} from '@/features/admin/finance/billing-account-collection-selection';
import type { BillingAccountStudentRow } from '@/types/finance-billing-account';

function student(
  id: number,
  overrides: Partial<BillingAccountStudentRow> = {},
): BillingAccountStudentRow {
  return { student_id: id, student_name: `Student ${id}`, ...overrides };
}

describe('record-collection button link from billing account detail', () => {
  it('builds /collections/new?billing_partner_id=<id>&returnTo=<encoded path>', () => {
    const returnTo = '/admin/finance/billing-accounts/9046';
    const href = buildBillingAccountCollectHref(9046, returnTo);
    expect(href).toBe(
      '/admin/finance/collections/new?billing_partner_id=9046&returnTo=%2Fadmin%2Ffinance%2Fbilling-accounts%2F9046',
    );
  });

  it('keeps the optional academic year scope when provided', () => {
    const href = buildBillingAccountCollectHref(9046, '/admin/finance/billing-accounts/9046', 7);
    expect(href).toContain('billing_partner_id=9046');
    expect(href).toContain('academic_year_id=7');
  });
});

describe('readCollectionNewParams', () => {
  it('reads billing_partner_id and returnTo from searchParams', () => {
    const params = readCollectionNewParams(
      new URLSearchParams(
        'billing_partner_id=9046&returnTo=%2Fadmin%2Ffinance%2Fbilling-accounts%2F9046',
      ),
    );
    expect(params.billingPartnerId).toBe('9046');
    expect(params.returnTo).toBe('/admin/finance/billing-accounts/9046');
    expect(params.studentId).toBe('');
  });

  it('supports camelCase aliases', () => {
    const params = readCollectionNewParams(
      new URLSearchParams('billingPartnerId=12&studentId=5&academicYearId=3'),
    );
    expect(params.billingPartnerId).toBe('12');
    expect(params.studentId).toBe('5');
    expect(params.academicYearId).toBe('3');
  });
});

describe('shouldUseBillingAccountStudentSelector', () => {
  it('is enabled when only a billing account is provided', () => {
    expect(
      shouldUseBillingAccountStudentSelector({ billingPartnerId: '9046', studentId: '' }),
    ).toBe(true);
  });

  it('keeps the legacy flow when a student is already locked', () => {
    expect(
      shouldUseBillingAccountStudentSelector({ billingPartnerId: '9046', studentId: '5' }),
    ).toBe(false);
  });

  it('keeps the legacy flow when no billing account is provided', () => {
    expect(
      shouldUseBillingAccountStudentSelector({ billingPartnerId: '', studentId: '' }),
    ).toBe(false);
  });
});

describe('resolveBillingCollectionStudentSelection', () => {
  it('requires an explicit choice when there is more than one student', () => {
    const selection = resolveBillingCollectionStudentSelection([student(1), student(2)]);
    expect(selection.requiresChoice).toBe(true);
    expect(selection.autoSelectedStudentId).toBeNull();
    expect(selection.isEmpty).toBe(false);
    expect(selection.students).toHaveLength(2);
  });

  it('auto-selects the only student', () => {
    const selection = resolveBillingCollectionStudentSelection([student(42)]);
    expect(selection.requiresChoice).toBe(false);
    expect(selection.autoSelectedStudentId).toBe(42);
  });

  it('reports an empty account with no students', () => {
    const selection = resolveBillingCollectionStudentSelection([]);
    expect(selection.isEmpty).toBe(true);
    expect(selection.autoSelectedStudentId).toBeNull();
  });
});

describe('resolveEffectiveSelectedStudentId', () => {
  it('shows only the chosen student among several (none selected by default)', () => {
    const selection = resolveBillingCollectionStudentSelection([student(1), student(2), student(3)]);
    expect(resolveEffectiveSelectedStudentId(selection, null)).toBeNull();
    expect(resolveEffectiveSelectedStudentId(selection, 2)).toBe(2);
  });

  it('ignores a manual id that does not belong to the account', () => {
    const selection = resolveBillingCollectionStudentSelection([student(1), student(2)]);
    expect(resolveEffectiveSelectedStudentId(selection, 999)).toBeNull();
  });

  it('auto-selects the single student without manual input', () => {
    const selection = resolveBillingCollectionStudentSelection([student(7)]);
    expect(resolveEffectiveSelectedStudentId(selection, null)).toBe(7);
  });
});
