'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { fetchAdmissions } from '../api/admissions-api';
import type { AdmissionListItem } from '@/types/admission';
import type { ApiErrorBody, ApiResponse, Pagination } from '@/types/api';

export const ADMISSIONS_KANBAN_COLUMN_PAGE_SIZE = 30;

/**
 * Stable fetch key for a set of kanban columns. The board effect keys off this
 * string instead of the `columns` array reference: callers frequently pass a
 * freshly-built array on every render (e.g. `[stateFilter]` or
 * `[...ACTIVE, ...CLOSED]`), and depending on the array identity would re-run
 * the effect — and re-fire one Odoo request per column — on every render,
 * producing a request storm. Two logically-equal column sets must yield the
 * same key regardless of array identity.
 */
export function kanbanColumnsKey(columns: string[]): string {
  return columns.join(',');
}

export interface AdmissionsKanbanColumn {
  state: string;
  items: AdmissionListItem[];
  total: number;
  /** Visible count after client-side filters (falls back to items.length). */
  visibleTotal?: number;
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: ApiErrorBody | null;
}

function dedupeById(items: AdmissionListItem[]): AdmissionListItem[] {
  const seen = new Set<number>();
  const out: AdmissionListItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function columnFromResponse(
  state: string,
  res: ApiResponse<AdmissionListItem[]>,
  page: number,
  previousItems: AdmissionListItem[],
): AdmissionsKanbanColumn {
  if (!res.success) {
    return {
      state,
      items: previousItems,
      total: previousItems.length,
      page,
      hasMore: false,
      loading: false,
      loadingMore: false,
      error: res.error,
    };
  }

  const pagination = res.meta?.pagination as Pagination | undefined;
  const merged = dedupeById(page > 1 ? [...previousItems, ...res.data] : res.data);
  const total = pagination?.total ?? merged.length;
  const hasMore = pagination
    ? pagination.page < pagination.total_pages
    : res.data.length >= ADMISSIONS_KANBAN_COLUMN_PAGE_SIZE;

  return {
    state,
    items: merged,
    total,
    page,
    hasMore,
    loading: false,
    loadingMore: false,
    error: null,
  };
}

export function useAdmissionsKanbanBoard({
  columns,
  search,
  enabled = true,
}: {
  columns: string[];
  search?: string;
  enabled?: boolean;
}) {
  const { activeSchoolId } = useAdminSession();
  const [columnStates, setColumnStates] = useState<Record<string, AdmissionsKanbanColumn>>({});
  const [initialLoading, setInitialLoading] = useState(enabled);
  const [nonce, setNonce] = useState(0);

  const columnsKey = kanbanColumnsKey(columns);
  const searchKey = search?.trim() ?? '';

  useEffect(() => {
    // Derive the column list from the stable string key, not the `columns`
    // prop, so a new-but-equal array reference does not re-trigger the effect.
    const activeColumns = columnsKey ? columnsKey.split(',') : [];
    if (!enabled || activeSchoolId == null || activeColumns.length === 0) {
      setInitialLoading(false);
      setColumnStates({});
      return;
    }

    let cancelled = false;
    setInitialLoading(true);
    setColumnStates(
      Object.fromEntries(
        activeColumns.map((state) => [
          state,
          {
            state,
            items: [],
            total: 0,
            page: 0,
            hasMore: false,
            loading: true,
            loadingMore: false,
            error: null,
          } satisfies AdmissionsKanbanColumn,
        ]),
      ),
    );

    void (async () => {
      const results = await Promise.all(
        activeColumns.map(async (state) => {
          const res = await fetchAdmissions({
            active_school_id: activeSchoolId,
            state,
            search: searchKey || undefined,
            page: 1,
            page_size: ADMISSIONS_KANBAN_COLUMN_PAGE_SIZE,
          });
          return { state, res };
        }),
      );

      if (cancelled) return;

      const next: Record<string, AdmissionsKanbanColumn> = {};
      for (const { state, res } of results) {
        next[state] = columnFromResponse(state, res, 1, []);
      }
      setColumnStates(next);
      setInitialLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, activeSchoolId, columnsKey, searchKey, nonce]);

  const loadMore = useCallback(
    async (state: string) => {
      if (activeSchoolId == null) return;
      const current = columnStates[state];
      if (!current || current.loadingMore || !current.hasMore) return;

      setColumnStates((prev) => ({
        ...prev,
        [state]: {
          ...prev[state],
          loadingMore: true,
        },
      }));

      const nextPage = current.page + 1;
      const res = await fetchAdmissions({
        active_school_id: activeSchoolId,
        state,
        search: searchKey || undefined,
        page: nextPage,
        page_size: ADMISSIONS_KANBAN_COLUMN_PAGE_SIZE,
      });

      setColumnStates((prev) => ({
        ...prev,
        [state]: columnFromResponse(state, res, nextPage, prev[state]?.items ?? []),
      }));
    },
    [activeSchoolId, columnStates, searchKey],
  );

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const grouped = useMemo(
    () =>
      columns.map((state) => {
        const col = columnStates[state];
        return (
          col ?? {
            state,
            items: [],
            total: 0,
            page: 0,
            hasMore: false,
            loading: initialLoading,
            loadingMore: false,
            error: null,
          }
        );
      }),
    [columns, columnStates, initialLoading],
  );

  const allItems = useMemo(() => grouped.flatMap((col) => col.items), [grouped]);

  const error = useMemo(
    () => grouped.map((col) => col.error).find((item) => item != null) ?? null,
    [grouped],
  );

  return {
    grouped,
    allItems,
    initialLoading,
    loadMore,
    reload,
    error,
  };
}
