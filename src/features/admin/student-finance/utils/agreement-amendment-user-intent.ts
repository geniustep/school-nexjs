function normalizeComparablePeriodIds(
  values: string[],
  blockedPeriodIds: string[],
): string[] {
  const blocked = new Set(blockedPeriodIds);
  return [...new Set(values.filter((value) => !blocked.has(value)))].sort();
}

export function hasUserChangedServiceDuration(input: {
  userEditedDuration: boolean;
  currentPeriodIds: string[];
  selectedPeriodIds: string[];
  blockedPeriodIds?: string[];
}): boolean {
  if (!input.userEditedDuration) return false;

  const blockedPeriodIds = input.blockedPeriodIds ?? [];
  const current = normalizeComparablePeriodIds(input.currentPeriodIds, blockedPeriodIds);
  const selected = normalizeComparablePeriodIds(input.selectedPeriodIds, blockedPeriodIds);

  return (
    current.length !== selected.length ||
    current.some((value, index) => value !== selected[index])
  );
}
