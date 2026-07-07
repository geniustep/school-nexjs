'use client';

import { useCallback, useEffect, useState } from 'react';

export type StudentsListViewMode = 'list' | 'kanban';

const STORAGE_KEY = 'admin-students-list-view-v1';
export const STUDENTS_LIST_VIEW_DEFAULT: StudentsListViewMode = 'kanban';

export function parseStudentsListViewPreference(
  stored: string | null | undefined,
): StudentsListViewMode {
  if (stored === 'kanban' || stored === 'list') return stored;
  return STUDENTS_LIST_VIEW_DEFAULT;
}

export function readStudentsListViewPreference(): StudentsListViewMode {
  if (typeof window === 'undefined') return STUDENTS_LIST_VIEW_DEFAULT;
  try {
    return parseStudentsListViewPreference(localStorage.getItem(STORAGE_KEY));
  } catch {
    /* ignore quota / private mode */
  }
  return STUDENTS_LIST_VIEW_DEFAULT;
}

export function useStudentsListView(): [StudentsListViewMode, (mode: StudentsListViewMode) => void] {
  const [view, setViewState] = useState<StudentsListViewMode>(STUDENTS_LIST_VIEW_DEFAULT);

  useEffect(() => {
    setViewState(readStudentsListViewPreference());
  }, []);

  const setView = useCallback((mode: StudentsListViewMode) => {
    setViewState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  return [view, setView];
}
