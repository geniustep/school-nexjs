/** Pure helpers for admissions list multi-select (Kanban + table). */

export function toggleAdmissionSelection(
  selectedIds: ReadonlySet<number>,
  id: number,
): Set<number> {
  const next = new Set(selectedIds);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function selectAllVisibleAdmissionIds(
  selectedIds: ReadonlySet<number>,
  visibleIds: readonly number[],
): Set<number> {
  const next = new Set(selectedIds);
  for (const id of visibleIds) next.add(id);
  return next;
}

export function deselectAllVisibleAdmissionIds(
  selectedIds: ReadonlySet<number>,
  visibleIds: readonly number[],
): Set<number> {
  const next = new Set(selectedIds);
  for (const id of visibleIds) next.delete(id);
  return next;
}

export function areAllVisibleAdmissionsSelected(
  selectedIds: ReadonlySet<number>,
  visibleIds: readonly number[],
): boolean {
  if (visibleIds.length === 0) return false;
  return visibleIds.every((id) => selectedIds.has(id));
}

export function areSomeVisibleAdmissionsSelected(
  selectedIds: ReadonlySet<number>,
  visibleIds: readonly number[],
): boolean {
  return visibleIds.some((id) => selectedIds.has(id));
}
