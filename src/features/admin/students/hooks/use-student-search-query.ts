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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!shouldFetchStudentSearch(debouncedQuery)) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    setError(false);

    executeStudentSearchQuery(debouncedQuery, activeSchoolId, seq, () => requestSeq.current)
      .then((outcome) => {
        if (outcome.kind === 'stale') return;
        if (outcome.kind === 'error') {
          setResults([]);
          setLoading(false);
          setError(true);
          return;
        }
        setResults(outcome.results);
        setLoading(false);
        setError(false);
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setResults([]);
        setLoading(false);
        setError(true);
      });
  }, [debouncedQuery, activeSchoolId]);

  return { loading, error, results };
}
