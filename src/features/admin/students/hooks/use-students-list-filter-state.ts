'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedValue } from './use-debounced-value';
import { STUDENT_SEARCH_DEBOUNCE_MS } from '../utils/student-search-query';
import {
  parseStudentsListUrl,
  replaceStudentsListUrl,
  studentsListHasActiveQuery,
  STUDENTS_LIST_DEFAULT_FILTERS,
  type StudentsListFilterValues,
} from '../utils/students-list-url';

export function useStudentsListFilterState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlState = useMemo(() => parseStudentsListUrl(searchParams), [searchParams]);

  const [searchDraft, setSearchDraft] = useState(urlState.search);
  const debouncedSearch = useDebouncedValue(searchDraft, STUDENT_SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setSearchDraft(urlState.search);
  }, [urlState.search]);

  const pushUrl = useCallback(
    (patch: Partial<StudentsListFilterValues>) => {
      replaceStudentsListUrl(router, pathname, searchParams, {
        ...urlState,
        ...patch,
      });
    },
    [router, pathname, searchParams, urlState],
  );

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (trimmed === urlState.search) return;
    pushUrl({ search: trimmed, page: 1 });
  }, [debouncedSearch, urlState.search, pushUrl]);

  const setSearch = useCallback((value: string) => {
    setSearchDraft(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchDraft('');
    pushUrl({ search: '', page: 1 });
  }, [pushUrl]);

  const setCycleCode = useCallback(
    (value: string) => {
      pushUrl({
        cycleCode: value,
        levelId: '',
        classId: '',
        page: 1,
      });
    },
    [pushUrl],
  );

  const setLevelId = useCallback(
    (value: string) => {
      pushUrl({
        levelId: value,
        classId: '',
        page: 1,
      });
    },
    [pushUrl],
  );

  const setClassId = useCallback(
    (value: string) => {
      pushUrl({ classId: value, page: 1 });
    },
    [pushUrl],
  );

  const setStatusFilter = useCallback(
    (value: string) => {
      pushUrl({ statusFilter: value, page: 1 });
    },
    [pushUrl],
  );

  const setAccountFilter = useCallback(
    (value: string) => {
      pushUrl({ accountFilter: value, page: 1 });
    },
    [pushUrl],
  );

  const setServiceId = useCallback(
    (value: string) => {
      const serviceId = value.trim();
      if (!serviceId) {
        pushUrl({ serviceId: '', servicePresence: '', page: 1 });
        return;
      }
      pushUrl({
        serviceId,
        servicePresence: urlState.servicePresence || 'has',
        page: 1,
      });
    },
    [pushUrl, urlState.servicePresence],
  );

  /** Count-card select: always `has`. Second click on the active card clears the filter. */
  const selectServiceHas = useCallback(
    (value: string) => {
      const serviceId = value.trim();
      if (!serviceId) {
        pushUrl({ serviceId: '', servicePresence: '', page: 1 });
        return;
      }
      if (urlState.serviceId === serviceId) {
        pushUrl({ serviceId: '', servicePresence: '', page: 1 });
        return;
      }
      pushUrl({ serviceId, servicePresence: 'has', page: 1 });
    },
    [pushUrl, urlState.serviceId],
  );

  const clearServiceFilter = useCallback(() => {
    pushUrl({ serviceId: '', servicePresence: '', page: 1 });
  }, [pushUrl]);

  const setServicePresence = useCallback(
    (value: StudentsListFilterValues['servicePresence']) => {
      if (!urlState.serviceId) return;
      pushUrl({
        servicePresence: value === 'not_has' ? 'not_has' : 'has',
        page: 1,
      });
    },
    [pushUrl, urlState.serviceId],
  );

  const setPage = useCallback(
    (page: number) => {
      pushUrl({ page });
    },
    [pushUrl],
  );

  const resetFilters = useCallback(() => {
    setSearchDraft('');
    replaceStudentsListUrl(router, pathname, searchParams, STUDENTS_LIST_DEFAULT_FILTERS);
  }, [router, pathname, searchParams]);

  const appliedQuery = useMemo(
    (): StudentsListFilterValues => ({
      search: urlState.search,
      cycleCode: urlState.cycleCode,
      levelId: urlState.levelId,
      classId: urlState.classId,
      statusFilter: urlState.statusFilter,
      accountFilter: urlState.accountFilter,
      serviceId: urlState.serviceId,
      servicePresence: urlState.servicePresence,
      page: urlState.page,
    }),
    [urlState],
  );

  const hasActiveQuery = useMemo(() => studentsListHasActiveQuery(appliedQuery), [appliedQuery]);

  const hasActiveFilters = useMemo(
    () =>
      studentsListHasActiveQuery({
        search: searchDraft,
        cycleCode: urlState.cycleCode,
        levelId: urlState.levelId,
        classId: urlState.classId,
        statusFilter: urlState.statusFilter,
        accountFilter: urlState.accountFilter,
        serviceId: urlState.serviceId,
        servicePresence: urlState.servicePresence,
      }),
    [searchDraft, urlState],
  );

  return {
    search: searchDraft,
    debouncedSearch,
    cycleCode: urlState.cycleCode,
    levelId: urlState.levelId,
    classId: urlState.classId,
    statusFilter: urlState.statusFilter,
    accountFilter: urlState.accountFilter,
    serviceId: urlState.serviceId,
    servicePresence: urlState.servicePresence,
    page: urlState.page,
    setSearch,
    clearSearch,
    setCycleCode,
    setLevelId,
    setClassId,
    setStatusFilter,
    setAccountFilter,
    setServiceId,
    selectServiceHas,
    clearServiceFilter,
    setServicePresence,
    setPage,
    resetFilters,
    hasActiveQuery,
    hasActiveFilters,
    appliedQuery,
  };
}
