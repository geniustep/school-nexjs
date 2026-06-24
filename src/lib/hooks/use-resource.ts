'use client';

// Client data-fetching hook over the BFF proxy. Returns a discriminated state
// plus a reload(). Built on the central `api` client only.

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { ApiErrorBody, ApiMeta, ListParams } from '@/types/api';

export interface ResourceState<T> {
  loading: boolean;
  /** True only on the first fetch when no cached data exists yet. */
  initialLoading: boolean;
  /** True when refetching while previous data is still shown. */
  fetching: boolean;
  data: T | null;
  meta: ApiMeta | null;
  error: ApiErrorBody | null;
  reload: () => void;
}

export function useResource<T>(
  path: string | null,
  query?: ListParams,
): ResourceState<T> {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  // Serialise query so the effect re-runs when any param changes.
  const queryKey = query ? JSON.stringify(query) : '';

  useEffect(() => {
    if (!path) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    api.get<T>(path, query).then((res) => {
      if (!active) return;
      if (res.success) {
        setData(res.data);
        setMeta(res.meta);
        setError(null);
      } else {
        setError(res.error);
        // Keep stale data during refetch errors so lists do not flash empty.
        setData((prev) => prev);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, queryKey, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    loading,
    initialLoading: loading && data === null,
    fetching: loading && data !== null,
    data,
    meta,
    error,
    reload,
  };
}
