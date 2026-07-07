'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  areAllVisibleAdmissionsSelected,
  areSomeVisibleAdmissionsSelected,
  deselectAllVisibleAdmissionIds,
  selectAllVisibleAdmissionIds,
  toggleAdmissionSelection,
} from '../utils/admissions-selection';

export function useAdmissionsSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  const selectionMode = selectedIds.size > 0;
  const selectedCount = selectedIds.size;

  const isSelected = useCallback((id: number) => selectedIds.has(id), [selectedIds]);

  const toggle = useCallback((id: number) => {
    setSelectedIds((prev) => toggleAdmissionSelection(prev, id));
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleVisible = useCallback((visibleIds: readonly number[]) => {
    setSelectedIds((prev) => {
      if (areAllVisibleAdmissionsSelected(prev, visibleIds)) {
        return deselectAllVisibleAdmissionIds(prev, visibleIds);
      }
      return selectAllVisibleAdmissionIds(prev, visibleIds);
    });
  }, []);

  const visibleSelectionState = useCallback(
    (visibleIds: readonly number[]) => ({
      allSelected: areAllVisibleAdmissionsSelected(selectedIds, visibleIds),
      someSelected: areSomeVisibleAdmissionsSelected(selectedIds, visibleIds),
    }),
    [selectedIds],
  );

  const selectedIdList = useMemo(() => [...selectedIds], [selectedIds]);

  return {
    selectedIds,
    selectedIdList,
    selectedCount,
    selectionMode,
    isSelected,
    toggle,
    clear,
    toggleVisible,
    visibleSelectionState,
    setSelectedIds,
  };
}
