export type AdmissionsListEmptyVariant = 'no-data' | 'no-match';

export function resolveAdmissionsListEmptyVariant(options: {
  hasActiveFilters: boolean;
  visibleCount: number;
  hiddenConvertedOnPage: number;
}): AdmissionsListEmptyVariant {
  if (
    options.hasActiveFilters ||
    (options.visibleCount === 0 && options.hiddenConvertedOnPage > 0)
  ) {
    return 'no-match';
  }
  return 'no-data';
}
