'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import type { StudentSearchHit } from '@/types/student-search';
import {
  executeStudentSearchQuery,
  shouldFetchStudentSearch,
  STUDENT_SEARCH_DEBOUNCE_MS,
} from '../utils/student-search-query';
import { useDebouncedValue } from './use-debounced-value';

export function useStudentSearchQuery(query: string) {
  const { activeSchoolId } = useAdminSession();
  const debouncedQuery = useDebouncedValue(query.trim(), STUDENT_SEARCH_DEBOUNCE_MS);
  const [results, setResults] = useState<StudentSearchHit[]>([]);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    const seq = ++requestSeq.current;

    if (!shouldFetchStudentSearch(debouncedQuery)) {
      setResults([]);
      setSuggestion(null);
      setLoading(false);
      setError(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(false);

    executeStudentSearchQuery(
      debouncedQuery,
      activeSchoolId,
      seq,
      () => requestSeq.current,
      controller.signal,
    )
      .then((outcome) => {
        if (outcome.kind === 'stale') return;
        if (outcome.kind === 'error') {
          setResults([]);
          setSuggestion(null);
          setLoading(false);
          setError(true);
          return;
        }
        setResults(outcome.results);
        setSuggestion(outcome.suggestion);
        setLoading(false);
        setError(false);
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setResults([]);
        setSuggestion(null);
        setLoading(false);
        setError(true);
      });

    return () => {
      controller.abort();
      if (requestSeq.current === seq) requestSeq.current += 1;
    };
  }, [debouncedQuery, activeSchoolId]);

  return { loading, error, results, suggestion };
}
