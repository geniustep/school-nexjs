/**
 * Safe read-only pagination collector for print reports.
 * Never mutates. Caps total records and never truncates silently.
 */

import type { ApiMeta, ApiResponse, ListParams, Pagination } from '@/types/api';

export type PrintScope = 'current_page' | 'all_filtered';

export const TEACHING_PRINT_SAFE_MAX_RECORDS = 1000;

export type FetchPageResult<T> = {
  success: true;
  data: T[];
  meta?: ApiMeta;
} | {
  success: false;
  error: { code: string; message: string; details?: Record<string, unknown> };
  meta?: ApiMeta;
};

export type FetchAllPaginatedForPrintOptions<T> = {
  fetchPage: (params: ListParams) => Promise<FetchPageResult<T> | ApiResponse<T[]>>;
  baseQuery?: ListParams;
  pageSize?: number;
  maxRecords?: number;
  signal?: AbortSignal;
  /** Starting page when scope is current_page */
  page?: number;
  scope: PrintScope;
};

export type FetchAllPaginatedForPrintResult<T> =
  | {
      ok: true;
      items: T[];
      scope: PrintScope;
      truncated: boolean;
      totalReported: number | null;
      pagesFetched: number;
      warning?: 'safe_maximum_exceeded';
    }
  | {
      ok: false;
      error: { code: string; message: string; details?: Record<string, unknown> };
      items: T[];
      pagesFetched: number;
    };

function readPagination(meta?: ApiMeta): Pagination | null {
  const p = meta?.pagination;
  if (!p || typeof p !== 'object') return null;
  if (
    typeof p.page !== 'number' ||
    typeof p.page_size !== 'number' ||
    typeof p.total !== 'number' ||
    typeof p.total_pages !== 'number'
  ) {
    return null;
  }
  return p;
}

function pageFingerprint(items: unknown[]): string {
  try {
    return JSON.stringify(items);
  } catch {
    return String(items.length);
  }
}

export async function fetchAllPaginatedForPrint<T>(
  options: FetchAllPaginatedForPrintOptions<T>,
): Promise<FetchAllPaginatedForPrintResult<T>> {
  const {
    fetchPage,
    baseQuery = {},
    pageSize = 100,
    maxRecords = TEACHING_PRINT_SAFE_MAX_RECORDS,
    signal,
    page = 1,
    scope,
  } = options;

  if (signal?.aborted) {
    return {
      ok: false,
      error: { code: 'aborted', message: 'Print fetch aborted.' },
      items: [],
      pagesFetched: 0,
    };
  }

  if (scope === 'current_page') {
    const res = await fetchPage({ ...baseQuery, page, page_size: pageSize });
    if (!res.success) {
      return {
        ok: false,
        error: res.error,
        items: [],
        pagesFetched: 0,
      };
    }
    const pagination = readPagination(res.meta);
    return {
      ok: true,
      items: res.data,
      scope,
      truncated: false,
      totalReported: pagination?.total ?? res.data.length,
      pagesFetched: 1,
    };
  }

  const collected: T[] = [];
  const seenPageFingerprints = new Set<string>();
  let currentPage = 1;
  let totalReported: number | null = null;
  let totalPages: number | null = null;
  let pagesFetched = 0;

  while (true) {
    if (signal?.aborted) {
      return {
        ok: false,
        error: { code: 'aborted', message: 'Print fetch aborted.' },
        items: collected,
        pagesFetched,
      };
    }

    const res = await fetchPage({
      ...baseQuery,
      page: currentPage,
      page_size: pageSize,
    });
    pagesFetched += 1;

    if (!res.success) {
      return {
        ok: false,
        error: res.error,
        items: collected,
        pagesFetched,
      };
    }

    const fingerprint = pageFingerprint(res.data);
    if (seenPageFingerprints.has(fingerprint) && res.data.length > 0) {
      return {
        ok: false,
        error: {
          code: 'duplicate_page',
          message: 'Duplicate page detected while collecting print records.',
          details: { page: currentPage },
        },
        items: collected,
        pagesFetched,
      };
    }
    seenPageFingerprints.add(fingerprint);

    const pagination = readPagination(res.meta);
    if (pagination) {
      totalReported = pagination.total;
      totalPages = pagination.total_pages;
      if (pagination.total !== totalReported && totalReported != null && pagesFetched > 1) {
        // Keep first authoritative total; mismatch is recorded via details only when failing.
      }
    } else if (totalReported == null) {
      // Missing pagination: treat as single-shot list (no further pages).
      collected.push(...res.data);
      return {
        ok: true,
        items: collected,
        scope,
        truncated: false,
        totalReported: collected.length,
        pagesFetched,
      };
    }

    for (const item of res.data) {
      if (collected.length >= maxRecords) {
        return {
          ok: true,
          items: collected,
          scope,
          truncated: true,
          totalReported: totalReported ?? collected.length,
          pagesFetched,
          warning: 'safe_maximum_exceeded',
        };
      }
      collected.push(item);
    }

    if (totalReported != null && totalReported > maxRecords && collected.length >= maxRecords) {
      return {
        ok: true,
        items: collected,
        scope,
        truncated: true,
        totalReported,
        pagesFetched,
        warning: 'safe_maximum_exceeded',
      };
    }

    const reachedByMeta =
      totalPages != null
        ? currentPage >= totalPages
        : totalReported != null
          ? collected.length >= totalReported
          : res.data.length < pageSize;

    if (reachedByMeta || res.data.length === 0) {
      return {
        ok: true,
        items: collected,
        scope,
        truncated: false,
        totalReported: totalReported ?? collected.length,
        pagesFetched,
      };
    }

    // Safety: prevent infinite loops when metadata is inconsistent.
    if (pagesFetched > 500) {
      return {
        ok: false,
        error: {
          code: 'pagination_loop_guard',
          message: 'Stopped print pagination after too many page fetches.',
        },
        items: collected,
        pagesFetched,
      };
    }

    currentPage += 1;
  }
}
