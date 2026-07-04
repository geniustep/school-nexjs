import { describe, expect, it } from 'vitest';
import {
  accountKindFilterToApiParam,
  normalizeApiAccountKind,
  parseAccountKindUrlParam,
  resolveBillingAccountKind,
  resolveBillingAccountKindFromRow,
} from '@/features/admin/finance/billing-account-kind';
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
  it('prefers account_kind from API', () => {
    expect(resolveBillingAccountKindFromRow(row(1, 1, 'family'))).toBe('family');
  });

  it('falls back to student_count when account_kind is missing', () => {
    expect(resolveBillingAccountKindFromRow(row(3, 1))).toBe('family');
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
