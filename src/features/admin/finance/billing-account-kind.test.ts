import { describe, expect, it } from 'vitest';
import {
  accountKindFilterToApiParam,
  normalizeApiAccountKind,
  parseAccountKindUrlParam,
  readBillingAccountKindFromSearchParams,
  resolveBillingAccountKind,
  resolveBillingAccountKindFromRow,
  writeBillingAccountKindSearchParam,
} from '@/features/admin/finance/billing-account-kind';
import { buildBillingAccountsListQuery } from '@/features/admin/finance/billing-accounts-list-panel';
import type { BillingAccountListItem } from '@/types/finance-billing-account';

function row(
  studentCount: number,
  id = 1,
  accountKind?: BillingAccountListItem['account_kind'],
): BillingAccountListItem {
  return { billing_partner_id: id, student_count: studentCount, account_kind: accountKind };
}

describe('resolveBillingAccountKind', () => {
  it('classifies family when student_count > 1', () => {
    expect(resolveBillingAccountKind(3)).toBe('family');
  });

  it('classifies individual when student_count = 1', () => {
    expect(resolveBillingAccountKind(1)).toBe('individual');
  });

  it('classifies empty when student_count = 0', () => {
    expect(resolveBillingAccountKind(0)).toBe('empty');
  });
});

describe('resolveBillingAccountKindFromRow', () => {
  it('prefers account_kind from API over student_count inference', () => {
    expect(resolveBillingAccountKindFromRow(row(1, 1, 'family'))).toBe('family');
    expect(resolveBillingAccountKindFromRow(row(3, 1, 'individual'))).toBe('individual');
  });

  it('falls back to student_count when account_kind is missing', () => {
    expect(resolveBillingAccountKindFromRow(row(3, 1))).toBe('family');
    expect(resolveBillingAccountKindFromRow(row(1, 1))).toBe('individual');
  });
});

describe('accountKindFilterToApiParam', () => {
  it('omits all', () => {
    expect(accountKindFilterToApiParam('all')).toBeUndefined();
  });

  it('passes family to API', () => {
    expect(accountKindFilterToApiParam('family')).toBe('family');
  });

  it('passes empty to API', () => {
    expect(accountKindFilterToApiParam('empty')).toBe('empty');
  });
});

describe('parseAccountKindUrlParam', () => {
  it('defaults to all', () => {
    expect(parseAccountKindUrlParam(null)).toBe('all');
  });

  it('accepts legacy no_students alias', () => {
    expect(parseAccountKindUrlParam('no_students')).toBe('empty');
  });

  it('normalizes API account_kind values', () => {
    expect(normalizeApiAccountKind('FAMILY')).toBe('family');
  });
});

describe('readBillingAccountKindFromSearchParams', () => {
  it('defaults missing param to all', () => {
    expect(readBillingAccountKindFromSearchParams(new URLSearchParams())).toBe('all');
  });

  it('reads explicit all', () => {
    expect(
      readBillingAccountKindFromSearchParams(new URLSearchParams('account_kind=all')),
    ).toBe('all');
  });

  it('reads individual', () => {
    expect(
      readBillingAccountKindFromSearchParams(new URLSearchParams('account_kind=individual')),
    ).toBe('individual');
  });

  it('reads family', () => {
    expect(
      readBillingAccountKindFromSearchParams(new URLSearchParams('account_kind=family')),
    ).toBe('family');
  });
});

describe('writeBillingAccountKindSearchParam', () => {
  it('omits all from URL (default)', () => {
    const params = new URLSearchParams('account_kind=individual&search=foo');
    writeBillingAccountKindSearchParam(params, 'all');
    expect(params.get('account_kind')).toBeNull();
    expect(params.get('search')).toBe('foo');
  });

  it('writes non-all kinds', () => {
    const params = new URLSearchParams();
    writeBillingAccountKindSearchParam(params, 'family');
    expect(params.get('account_kind')).toBe('family');
    writeBillingAccountKindSearchParam(params, 'individual');
    expect(params.get('account_kind')).toBe('individual');
  });
});

describe('buildBillingAccountsListQuery', () => {
  const base = {
    search: '',
    academicYearId: '',
    classId: '',
    levelId: '',
    hasBalance: false,
    hasOverdue: false,
    page: 1,
  };

  it('family-only selection emits account_kind=family', () => {
    expect(buildBillingAccountsListQuery({ ...base, accountKind: 'family' })).toMatchObject({
      account_kind: 'family',
    });
  });

  it('all accounts omits account_kind', () => {
    expect(buildBillingAccountsListQuery({ ...base, accountKind: 'all' }).account_kind).toBeUndefined();
  });

  it('preserves account_kind when another filter changes', () => {
    const query = buildBillingAccountsListQuery({
      ...base,
      accountKind: 'family',
      search: 'مراد',
      page: 2,
    });
    expect(query).toMatchObject({
      account_kind: 'family',
      search: 'مراد',
      page: 2,
    });
  });

  it('switching back to all removes account_kind from query', () => {
    expect(buildBillingAccountsListQuery({ ...base, accountKind: 'all' }).account_kind).toBeUndefined();
    expect(buildBillingAccountsListQuery({ ...base, accountKind: 'family' }).account_kind).toBe('family');
  });
});
