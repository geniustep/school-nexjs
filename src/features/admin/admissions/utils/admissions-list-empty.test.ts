import { describe, expect, it } from 'vitest';
import { resolveAdmissionsListEmptyVariant } from '@/features/admin/admissions/utils/admissions-list-empty';

describe('resolveAdmissionsListEmptyVariant', () => {
  it('returns no-data when there are no active filters and nothing hidden', () => {
    expect(
      resolveAdmissionsListEmptyVariant({
        hasActiveFilters: false,
        visibleCount: 0,
        hiddenConvertedOnPage: 0,
      }),
    ).toBe('no-data');
  });

  it('returns no-match when filters are active', () => {
    expect(
      resolveAdmissionsListEmptyVariant({
        hasActiveFilters: true,
        visibleCount: 0,
        hiddenConvertedOnPage: 0,
      }),
    ).toBe('no-match');
  });

  it('returns no-match when converted rows are hidden from view', () => {
    expect(
      resolveAdmissionsListEmptyVariant({
        hasActiveFilters: false,
        visibleCount: 0,
        hiddenConvertedOnPage: 3,
      }),
    ).toBe('no-match');
  });
});
