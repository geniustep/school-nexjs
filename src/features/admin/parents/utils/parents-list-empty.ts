export type ParentsListEmptyVariant = 'no-data' | 'no-match';

export function resolveParentsListEmptyVariant(options: {
  hasActiveFilters: boolean;
  visibleFamilyCount: number;
  hiddenGuardianOnlyCount: number;
}): ParentsListEmptyVariant {
  if (
    options.hasActiveFilters ||
    (options.visibleFamilyCount === 0 && options.hiddenGuardianOnlyCount > 0)
  ) {
    return 'no-match';
  }
  return 'no-data';
}
