'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { fetchAdmissions } from '../api/admissions-api';
import {
  filterKanbanItemsByApplicationStatus,
  partitionKanbanItemsByApplicationStatus,
} from '../utils/admission-kanban-status-partition';
import { withKanbanBoardListQuery } from '../utils/admission-kanban-projection';
import type { AdmissionListItem } from '@/types/admission';
import type { ApiErrorBody, ApiResponse, Pagination } from '@/types/api';

export const ADMISSIONS_KANBAN_COLUMN_PAGE_SIZE = 30;
/** Workspace-scoped board fetch — covers typical follow_up / awaiting_decision queues. */
export const ADMISSIONS_KANBAN_BOARD_PAGE_SIZE = 100;

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

function columnFromFilteredItems(
  state: string,
  items: AdmissionListItem[],
  page: number,
  hasMore: boolean,
  error: ApiErrorBody | null = null,
): AdmissionsKanbanColumn {
  return {
    state,
    items,
    total: items.length,
    page,
    hasMore,
    loading: false,
    loadingMore: false,
    error,
  };
}

function columnFromResponse(
  state: string,
  res: ApiResponse<AdmissionListItem[]>,
  page: number,
  previousItems: AdmissionListItem[],
  /** When true, drop rows whose application_status ≠ column id. */
  enforceApplicationStatus: boolean,
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
  const rawMerged = dedupeById(page > 1 ? [...previousItems, ...res.data] : res.data);
  const merged = enforceApplicationStatus
    ? filterKanbanItemsByApplicationStatus(rawMerged, state)
    : rawMerged;
  // Prefer Backend pagination.total. Fall back to loaded length only when the
  // server ignored application_status and we filtered rows client-side.
  const backendHonorsStatus =
    !enforceApplicationStatus || merged.length === rawMerged.length;
  const total =
    backendHonorsStatus && typeof pagination?.total === 'number'
      ? pagination.total
      : merged.length;
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

function partitionBoardIntoColumns(
  columns: string[],
  boardItems: AdmissionListItem[],
  page: number,
  hasMore: boolean,
  error: ApiErrorBody | null,
): Record<string, AdmissionsKanbanColumn> {
  const parts = partitionKanbanItemsByApplicationStatus(boardItems, columns);
  const next: Record<string, AdmissionsKanbanColumn> = {};
  for (const state of columns) {
    next[state] = columnFromFilteredItems(
      state,
      parts[state] ?? [],
      page,
      hasMore,
      error,
    );
  }
  return next;
}

export function useAdmissionsKanbanBoard({
  columns,
  search,
  extraQuery,
  /**
   * When true: one workspace-scoped fetch (extraQuery.workspace), then partition
   * by application_status. Required while Backend ignores column application_status.
   */
  partitionByApplicationStatus = false,
  enabled = true,
}: {
  columns: string[];
  search?: string;
  /** Server-side board scope / context filters. */
  extraQuery?: Record<string, string | number | undefined>;
  partitionByApplicationStatus?: boolean;
  enabled?: boolean;
}) {
  const { activeSchoolId } = useAdminSession();
  const [columnStates, setColumnStates] = useState<Record<string, AdmissionsKanbanColumn>>({});
  const [boardItems, setBoardItems] = useState<AdmissionListItem[]>([]);
  const [boardPage, setBoardPage] = useState(0);
  const [boardHasMore, setBoardHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(enabled);
  const [nonce, setNonce] = useState(0);

  const columnsKey = kanbanColumnsKey(columns);
  const searchKey = search?.trim() ?? '';
  const extraQueryKey = useMemo(() => {
    if (!extraQuery) return '';
    return Object.entries(extraQuery)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
  }, [extraQuery]);

  const resolvedExtraQuery = useMemo(() => {
    if (!extraQuery) return {};
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(extraQuery)) {
      if (v !== undefined && v !== null && v !== '') out[k] = v;
    }
    return out;
  }, [extraQueryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const activeColumns = columnsKey ? columnsKey.split(',') : [];
    if (!enabled || activeSchoolId == null || activeColumns.length === 0) {
      setInitialLoading(false);
      setColumnStates({});
      setBoardItems([]);
      setBoardPage(0);
      setBoardHasMore(false);
      return;
    }

    let cancelled = false;

    // Soft refresh: keep previous cards visible; only block the whole board on first load.
    setColumnStates((prev) => {
      const hadItems = activeColumns.some((state) => (prev[state]?.items?.length ?? 0) > 0);
      setInitialLoading(!hadItems);
      return Object.fromEntries(
        activeColumns.map((state) => {
          const existing = prev[state];
          const keepItems = existing?.items ?? [];
          return [
            state,
            {
              state,
              items: keepItems,
              total: existing?.total ?? keepItems.length,
              page: existing?.page ?? 0,
              hasMore: existing?.hasMore ?? false,
              // Empty columns show local skeleton; populated columns stay visible.
              loading: keepItems.length === 0,
              loadingMore: false,
              error: null,
            } satisfies AdmissionsKanbanColumn,
          ];
        }),
      );
    });

    void (async () => {
      if (partitionByApplicationStatus) {
        // Full list payload (not projection=kanban) so last_action.note reaches cards.
        const res = await fetchAdmissions(
          withKanbanBoardListQuery({
            active_school_id: activeSchoolId,
            search: searchKey || undefined,
            page: 1,
            page_size: ADMISSIONS_KANBAN_BOARD_PAGE_SIZE,
            ...resolvedExtraQuery,
          }),
        );
        if (cancelled) return;
        if (!res.success) {
          setBoardItems([]);
          setBoardPage(1);
          setBoardHasMore(false);
          setColumnStates(
            partitionBoardIntoColumns(activeColumns, [], 1, false, res.error),
          );
          setInitialLoading(false);
          return;
        }
        const pagination = res.meta?.pagination as Pagination | undefined;
        const items = dedupeById(res.data);
        const hasMore = pagination
          ? pagination.page < pagination.total_pages
          : res.data.length >= ADMISSIONS_KANBAN_BOARD_PAGE_SIZE;
        setBoardItems(items);
        setBoardPage(1);
        setBoardHasMore(hasMore);
        setColumnStates(partitionBoardIntoColumns(activeColumns, items, 1, hasMore, null));
        setInitialLoading(false);
        return;
      }

      // Progressive settle: paint the board as soon as the first column returns
      // instead of waiting for Promise.all wall-time (slowest column).
      let settledCount = 0;
      await Promise.all(
        activeColumns.map(async (state) => {
          // Full list payload (not projection=kanban) so last_action.note reaches cards.
          const res = await fetchAdmissions(
            withKanbanBoardListQuery({
              active_school_id: activeSchoolId,
              application_status: state,
              search: searchKey || undefined,
              page: 1,
              page_size: ADMISSIONS_KANBAN_COLUMN_PAGE_SIZE,
              ...resolvedExtraQuery,
            }),
          );
          if (cancelled) return;
          settledCount += 1;
          setColumnStates((prev) => ({
            ...prev,
            [state]: columnFromResponse(state, res, 1, [], true),
          }));
          if (settledCount === 1) setInitialLoading(false);
        }),
      );
      if (!cancelled) setInitialLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    activeSchoolId,
    columnsKey,
    searchKey,
    extraQueryKey,
    nonce,
    resolvedExtraQuery,
    partitionByApplicationStatus,
  ]);

  const loadMore = useCallback(
    async (state: string) => {
      if (activeSchoolId == null) return;

      if (partitionByApplicationStatus) {
        if (!boardHasMore) return;
        const anyLoading = Object.values(columnStates).some((c) => c.loadingMore);
        if (anyLoading) return;

        setColumnStates((prev) => {
          const next = { ...prev };
          for (const col of columnsKey.split(',')) {
            if (!next[col]) continue;
            next[col] = { ...next[col], loadingMore: true };
          }
          return next;
        });

        const nextPage = boardPage + 1;
        const res = await fetchAdmissions(
          withKanbanBoardListQuery({
            active_school_id: activeSchoolId,
            search: searchKey || undefined,
            page: nextPage,
            page_size: ADMISSIONS_KANBAN_BOARD_PAGE_SIZE,
            ...resolvedExtraQuery,
          }),
        );

        if (!res.success) {
          setColumnStates((prev) =>
            partitionBoardIntoColumns(
              columnsKey.split(','),
              boardItems,
              boardPage,
              false,
              res.error,
            ),
          );
          return;
        }

        const pagination = res.meta?.pagination as Pagination | undefined;
        const merged = dedupeById([...boardItems, ...res.data]);
        const hasMore = pagination
          ? pagination.page < pagination.total_pages
          : res.data.length >= ADMISSIONS_KANBAN_BOARD_PAGE_SIZE;
        setBoardItems(merged);
        setBoardPage(nextPage);
        setBoardHasMore(hasMore);
        setColumnStates(
          partitionBoardIntoColumns(columnsKey.split(','), merged, nextPage, hasMore, null),
        );
        return;
      }

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
      const res = await fetchAdmissions(
        withKanbanBoardListQuery({
          active_school_id: activeSchoolId,
          application_status: state,
          search: searchKey || undefined,
          page: nextPage,
          page_size: ADMISSIONS_KANBAN_COLUMN_PAGE_SIZE,
          ...resolvedExtraQuery,
        }),
      );

      setColumnStates((prev) => ({
        ...prev,
        [state]: columnFromResponse(state, res, nextPage, prev[state]?.items ?? [], true),
      }));
    },
    [
      activeSchoolId,
      boardHasMore,
      boardItems,
      boardPage,
      columnStates,
      columnsKey,
      partitionByApplicationStatus,
      resolvedExtraQuery,
      searchKey,
    ],
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
