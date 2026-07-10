'use client';

import { useMemo, useState } from 'react';
import type { StudentSearchHit } from '@/types/student-search';
import {
  filterExcludedStudentSearchHits,
  resolveStudentSearchPickerViewState,
} from '../utils/student-search-picker-utils';
import { useStudentSearchQuery } from './use-student-search-query';

export function useStudentSearchPicker(options?: {
  excludeStudentIds?: number[];
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const searchState = useStudentSearchQuery(query);

  const visibleResults = useMemo(
    () => filterExcludedStudentSearchHits(searchState.results, options?.excludeStudentIds),
    [searchState.results, options?.excludeStudentIds],
  );

  const viewState = useMemo(
    () =>
      resolveStudentSearchPickerViewState({
        query,
        loading: searchState.loading,
        error: searchState.error,
        resultCount: visibleResults.length,
        suggestion: searchState.suggestion,
        disabled: options?.disabled,
      }),
    [
      query,
      searchState.loading,
      searchState.error,
      visibleResults.length,
      searchState.suggestion,
      options?.disabled,
    ],
  );

  function applySuggestion(nextQuery: string) {
    setQuery(nextQuery);
  }

  function clearQuery() {
    setQuery('');
  }

  return {
    query,
    setQuery,
    clearQuery,
    applySuggestion,
    visibleResults,
    suggestion: searchState.suggestion,
    loading: searchState.loading,
    error: searchState.error,
    viewState,
  };
}

export type UseStudentSearchPickerReturn = ReturnType<typeof useStudentSearchPicker>;

export type StudentSearchPickerSelectHandler = (student: StudentSearchHit) => void;
