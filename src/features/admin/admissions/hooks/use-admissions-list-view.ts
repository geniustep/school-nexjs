'use client';

import { useCallback, useEffect, useState } from 'react';

export type AdmissionsListViewMode = 'kanban' | 'table';

const STORAGE_KEY = 'admin-admissions-list-view-v1';
export const ADMISSIONS_LIST_VIEW_DEFAULT: AdmissionsListViewMode = 'kanban';

export function parseAdmissionsListViewPreference(
  stored: string | null | undefined,
): AdmissionsListViewMode {
  if (stored === 'kanban' || stored === 'table') return stored;
  return ADMISSIONS_LIST_VIEW_DEFAULT;
}

export function readAdmissionsListViewPreference(): AdmissionsListViewMode {
  if (typeof window === 'undefined') return ADMISSIONS_LIST_VIEW_DEFAULT;
  try {
    return parseAdmissionsListViewPreference(localStorage.getItem(STORAGE_KEY));
  } catch {
    /* ignore quota / private mode */
  }
  return ADMISSIONS_LIST_VIEW_DEFAULT;
}

export function useAdmissionsListView(): [
  AdmissionsListViewMode,
  (mode: AdmissionsListViewMode) => void,
] {
  const [view, setViewState] = useState<AdmissionsListViewMode>(ADMISSIONS_LIST_VIEW_DEFAULT);

  useEffect(() => {
    setViewState(readAdmissionsListViewPreference());
  }, []);

  const setView = useCallback((mode: AdmissionsListViewMode) => {
    setViewState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  return [view, setView];
}
