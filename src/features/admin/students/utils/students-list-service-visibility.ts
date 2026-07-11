/**
 * Students-list service filter visibility helpers.
 * Visibility is decided by Backend — Next.js must not filter by name/code/count.
 */

export function isStudentsListServiceOptionVisible(
  serviceId: string,
  visibleIds: Iterable<string | number>,
): boolean {
  const id = serviceId.trim();
  if (!id || !/^\d+$/.test(id)) return false;
  for (const entry of visibleIds) {
    if (String(entry) === id) return true;
  }
  return false;
}

/**
 * When URL points at a service that is no longer filter-visible, clear it.
 * Returns true when the current selection is stale.
 */
export function isStaleStudentsListServiceSelection(
  serviceId: string,
  options: {
    feeTypesLoaded: boolean;
    feeTypeIds: Iterable<string | number>;
    countsLoaded: boolean;
    countServiceIds: Iterable<string | number>;
  },
): boolean {
  const id = serviceId.trim();
  if (!id) return false;

  if (options.feeTypesLoaded) {
    if (!isStudentsListServiceOptionVisible(id, options.feeTypeIds)) return true;
  }
  if (options.countsLoaded) {
    if (!isStudentsListServiceOptionVisible(id, options.countServiceIds)) return true;
  }
  return false;
}
