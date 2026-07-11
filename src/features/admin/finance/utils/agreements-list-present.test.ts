import { describe, expect, it } from 'vitest';
import {
  AGREEMENTS_PAGE_SIZE,
  agreementsListHasActiveQuery,
  formatAgreementListDate,
  formatAgreementListNumber,
  resolveAgreementsListEmptyVariant,
} from '@/features/admin/finance/utils/agreements-list-present';

describe('agreements-list-present', () => {
  it('maps page size to API page_size 20', () => {
    expect(AGREEMENTS_PAGE_SIZE).toBe(20);
  });

  it('detects active scope and filter state', () => {
    expect(agreementsListHasActiveQuery({})).toBe(false);
    expect(agreementsListHasActiveQuery({ search: '  ' })).toBe(false);
    expect(agreementsListHasActiveQuery({ search: 'AGR-1' })).toBe(true);
    expect(agreementsListHasActiveQuery({ stateFilter: 'active' })).toBe(true);
    expect(agreementsListHasActiveQuery({ yearId: '3' })).toBe(true);
    expect(agreementsListHasActiveQuery({ dateFrom: '2026-01-01' })).toBe(true);
    expect(agreementsListHasActiveQuery({ billingPartnerId: '9' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveAgreementsListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveAgreementsListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });

  it('formats agreement date presentation only', () => {
    expect(formatAgreementListDate(null, () => 'x', '—')).toBe('—');
    expect(
      formatAgreementListDate('2026-07-10', (v) => `fmt:${v}`, '—'),
    ).toBe('fmt:2026-07-10');
  });

  it('formats agreement number for list presentation', () => {
    expect(formatAgreementListNumber({ id: 7, number: 'AGR-7' })).toBe('AGR-7');
    expect(formatAgreementListNumber({ id: 7, name: 'Agreement 7' })).toBe('Agreement 7');
    expect(formatAgreementListNumber({ id: 7 })).toBe('#7');
  });
});
