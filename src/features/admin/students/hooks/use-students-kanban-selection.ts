'use client';

import { useCallback, useMemo, useState } from 'react';

export function useStudentsKanbanSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  const toggle = useCallback((studentId: number, next?: boolean) => {
    setSelectedIds((current) => {
      const copy = new Set(current);
      const shouldSelect = next ?? !copy.has(studentId);
      if (shouldSelect) copy.add(studentId);
      else copy.delete(studentId);
      return copy;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedCount = selectedIds.size;

  const isSelected = useCallback((studentId: number) => selectedIds.has(studentId), [selectedIds]);

  return useMemo(
    () => ({
      selectedIds,
      selectedCount,
      isSelected,
      toggle,
      clear,
    }),
    [selectedIds, selectedCount, isSelected, toggle, clear],
  );
}
