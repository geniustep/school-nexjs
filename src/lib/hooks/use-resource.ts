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

export type UseResourceOptions = {
  /** Collect every server page before exposing data; opt-in for complete grids. */
  allPages?: boolean;
  /**
   * When false, clear data+meta as soon as path/query changes so the UI cannot
   * flash a previous filter's rows or pagination.total. Default true.
   */
  keepPreviousData?: boolean;
};

export function useResource<T>(
  path: string | null,
  query?: ListParams,
  options?: UseResourceOptions,
): ResourceState<T> {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);
  const keepPreviousData = options?.keepPreviousData !== false;
  const allPages = options?.allPages === true;

  // Serialise query so the effect re-runs when any param changes.
  const queryKey = query ? JSON.stringify(query) : '';

  useEffect(() => {
    if (!path) {
      setLoading(false);
      setData(null);
      setMeta(null);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    if (!keepPreviousData) {
      setData(null);
      setMeta(null);
    }
    const load = async () => {
      if (!allPages) return api.get<T>(path, query);
      const first = await api.get<T>(path, { ...query, page: 1, limit: 100 });
      if (!first.success || !Array.isArray(first.data)) return first;
      const pagination = first.meta.pagination;
      if (!pagination) return first;
      const items = [...first.data];
      const incomplete = () => ({ success: false as const, error: {
        code: 'pagination_incomplete', message: 'The complete list could not be loaded. Please retry.',
      }, meta: first.meta });
      if (!Number.isInteger(pagination.total_pages) || pagination.total_pages < 0 || !Number.isInteger(pagination.total) || pagination.total < 0) return incomplete();
      for (let page = 2; page <= pagination.total_pages; page++) {
        if (!active) return incomplete();
        const next = await api.get<T>(path, { ...query, page, limit: 100 });
        if (!next.success) return next;
        if (!Array.isArray(next.data) || !next.data.length || next.meta.pagination?.page !== page || next.meta.pagination.total !== pagination.total || next.meta.pagination.total_pages !== pagination.total_pages) return incomplete();
        items.push(...next.data);
      }
      if (items.length !== pagination.total) return incomplete();
      return { ...first, data: items as T };
    };
    load().then((res) => {
      if (!active) return;
      if (res.success) {
        setData(res.data);
        setMeta(res.meta);
        setError(null);
      } else {
        setError(res.error);
        // Keep stale data during refetch errors so lists do not flash empty
        // (only meaningful when keepPreviousData is on).
        if (keepPreviousData) setData((prev) => prev);
      }
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setError({ code: 'network_error', message: 'The data could not be loaded. Please retry.' });
      setLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, queryKey, nonce, keepPreviousData, allPages]);

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
