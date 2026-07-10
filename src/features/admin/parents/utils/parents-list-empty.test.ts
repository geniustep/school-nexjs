import { describe, expect, it } from 'vitest';
import { resolveParentsListEmptyVariant } from '@/features/admin/parents/utils/parents-list-empty';

describe('resolveParentsListEmptyVariant', () => {
  it('returns no-data when there are no filters and no hidden guardian-only families', () => {
    expect(
      resolveParentsListEmptyVariant({
        hasActiveFilters: false,
        visibleFamilyCount: 0,
        hiddenGuardianOnlyCount: 0,
      }),
    ).toBe('no-data');
  });

  it('returns no-match when filters are active', () => {
    expect(
      resolveParentsListEmptyVariant({
        hasActiveFilters: true,
        visibleFamilyCount: 0,
        hiddenGuardianOnlyCount: 0,
      }),
    ).toBe('no-match');
  });

  it('returns no-match when guardian-only families are hidden by default toggle', () => {
    expect(
      resolveParentsListEmptyVariant({
        hasActiveFilters: false,
        visibleFamilyCount: 0,
        hiddenGuardianOnlyCount: 2,
      }),
    ).toBe('no-match');
  });
});
