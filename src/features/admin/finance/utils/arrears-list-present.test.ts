import { describe, expect, it } from 'vitest';
import {
  ARREARS_PAGE_SIZE,
  arrearsActionableAmount,
  arrearsGrossAmount,
  arrearsListHasActiveQuery,
  arrearsPendingCoverageAmount,
  arrearsSupportsActionableContract,
  formatArrearsListDate,
  resolveArrearsFollowupTab,
  resolveArrearsListEmptyVariant,
} from '@/features/admin/finance/utils/arrears-list-present';

describe('arrears-list-present', () => {
  it('maps page size to API page_size 20', () => {
    expect(ARREARS_PAGE_SIZE).toBe(20);
  });

  it('resolves tab/query state', () => {
    expect(resolveArrearsFollowupTab('')).toBe('all');
    expect(resolveArrearsFollowupTab('needs_followup')).toBe('needs_followup');
    expect(resolveArrearsFollowupTab('unknown')).toBe('all');
    expect(arrearsListHasActiveQuery({})).toBe(false);
    expect(arrearsListHasActiveQuery({ tab: 'all' })).toBe(false);
    expect(arrearsListHasActiveQuery({ tab: 'payment_promises' })).toBe(true);
    expect(arrearsListHasActiveQuery({ search: 'family' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveArrearsListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveArrearsListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });

  it('formats dates for list presentation only', () => {
    expect(formatArrearsListDate(undefined, () => 'x', '—')).toBe('—');
    expect(formatArrearsListDate('2026-07-10', (v) => `d:${v}`, '—')).toBe('d:2026-07-10');
  });
});


describe('actionable arrears presentation contract', () => {
  const actionableRow = {
    family_id: 1204,
    billing_partner_id: 1204,
    total_overdue: 1600,
    gross_overdue_amount: 1600,
    pending_cheque_coverage_amount: 1500,
    actionable_overdue_amount: 100,
  };

  it('uses backend actionable/gross/pending values without recomputing them', () => {
    expect(arrearsActionableAmount(actionableRow)).toBe(100);
    expect(arrearsPendingCoverageAmount(actionableRow)).toBe(1500);
    expect(arrearsGrossAmount(actionableRow)).toBe(1600);
  });

  it('falls back safely to legacy total_overdue when additive fields are absent', () => {
    const legacyRow = { family_id: 1, total_overdue: 900 };
    expect(arrearsActionableAmount(legacyRow)).toBe(900);
    expect(arrearsGrossAmount(legacyRow)).toBe(900);
    expect(arrearsPendingCoverageAmount(legacyRow)).toBeUndefined();
  });

  it('detects the additive backend capability from summary or row fields', () => {
    expect(arrearsSupportsActionableContract({ items: [actionableRow], summary: null, appliedTab: null })).toBe(true);
    expect(arrearsSupportsActionableContract({ items: [], summary: { actionable_overdue_accounts_count: 0 }, appliedTab: null })).toBe(true);
    expect(arrearsSupportsActionableContract({ items: [{ family_id: 1, total_overdue: 900 }], summary: { overdue_accounts_count: 1, total_overdue_amount: 900 }, appliedTab: null })).toBe(false);
  });
});
