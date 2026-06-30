'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { fetchAdmissions } from '../api/admissions-api';
import {
  itemMatchesUiStageFilter,
  rawStatesForUiStageFetch,
  type AdmissionUiStage,
} from '../utils/admission-ui-stage';
import { ACTIVE_KANBAN_STATES } from '../utils/admission-labels';
import type { AdmissionListItem } from '@/types/admission';
import type { ApiErrorBody, Pagination } from '@/types/api';

const FETCH_PAGE_SIZE = 100;

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

export function useAdmissionsUiStageTableList({
  page,
  pageSize,
  search,
  uiStageFilter,
  enabled = true,
}: {
  page: number;
  pageSize: number;
  search?: string;
  uiStageFilter: AdmissionUiStage;
  enabled?: boolean;
}) {
  const { activeSchoolId } = useAdminSession();
  const [allItems, setAllItems] = useState<AdmissionListItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(enabled);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const rawStates = useMemo(() => {
    const states = rawStatesForUiStageFetch(uiStageFilter);
    return states.length > 0 ? states : [...ACTIVE_KANBAN_STATES];
  }, [uiStageFilter]);

  const searchKey = search?.trim() ?? '';
  const rawStatesKey = rawStates.join(',');

  useEffect(() => {
    if (!enabled || activeSchoolId == null) {
      setInitialLoading(false);
      return;
    }

    let cancelled = false;
    setInitialLoading(true);
    setError(null);

    void (async () => {
      const results = await Promise.all(
        rawStates.map((state) =>
          fetchAdmissions({
            active_school_id: activeSchoolId,
            state,
            search: searchKey || undefined,
            page: 1,
            page_size: FETCH_PAGE_SIZE,
          }),
        ),
      );

      if (cancelled) return;

      const failed = results.find((res) => !res.success);
      if (failed && !failed.success) {
        setError(failed.error);
        setAllItems([]);
        setInitialLoading(false);
        return;
      }

      const merged = dedupeById(
        results.flatMap((res) => (res.success ? res.data : [])),
      ).filter((item) => itemMatchesUiStageFilter(item, uiStageFilter));

      setAllItems(merged);
      setInitialLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, activeSchoolId, uiStageFilter, rawStatesKey, searchKey, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const pagination: Pagination = useMemo(() => {
    const total = allItems.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      page: Math.min(page, totalPages),
      page_size: pageSize,
      total,
      total_pages: totalPages,
    };
  }, [allItems.length, page, pageSize]);

  const data = useMemo(() => {
    const start = (pagination.page - 1) * pageSize;
    return allItems.slice(start, start + pageSize);
  }, [allItems, pagination.page, pageSize]);

  return {
    data,
    loading: initialLoading,
    initialLoading,
    fetching: false,
    error,
    meta: { pagination },
    reload,
  };
}
