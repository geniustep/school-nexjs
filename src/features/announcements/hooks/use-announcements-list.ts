'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useActiveRole } from '@/features/auth/active-role-context';
import {
  fetchAnnouncementList,
  type AnnouncementsQuery,
} from '@/features/announcements/api/announcements-api';
import type { AnnouncementDelivery, AnnouncementListPage } from '@/types/announcement-delivery';
import type { ApiErrorBody } from '@/types/api';

export type AnnouncementsListState = {
  loading: boolean;
  initialLoading: boolean;
  fetching: boolean;
  data: AnnouncementListPage | null;
  error: ApiErrorBody | null;
  reload: () => void;
  setPage: (page: number) => void;
  page: number;
  /** Patch a list item after mark-read / detail reconcile (same scope only). */
  patchItem: (item: Partial<AnnouncementDelivery> & { id: number }) => void;
  adjustUnread: (delta: number) => void;
};

/**
 * Paginated announcements list with active-role + student_id isolation.
 * keepPreviousData is false across scope changes to block stale flashes.
 */
export function useAnnouncementsList(opts?: {
  studentId?: number;
  pageSize?: number;
}): AnnouncementsListState {
  const { activeRole } = useActiveRole();
  const studentId = opts?.studentId;
  const pageSize = opts?.pageSize ?? 20;
  const [page, setPageState] = useState(1);
  const [nonce, setNonce] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnnouncementListPage | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const generationRef = useRef(0);

  // Reset page when role or child scope changes.
  useEffect(() => {
    setPageState(1);
    setData(null);
    setError(null);
    generationRef.current += 1;
  }, [activeRole, studentId]);

  useEffect(() => {
    const gen = ++generationRef.current;
    let active = true;
    setLoading(true);
    setError(null);
    setData(null);

    const query: AnnouncementsQuery = {
      page,
      page_size: pageSize,
      student_id: studentId,
    };

    fetchAnnouncementList(query).then((res) => {
      if (!active || gen !== generationRef.current) return;
      if (res.ok) {
        setData(res.data);
        setError(null);
      } else {
        setError(res.error);
        setData(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [activeRole, studentId, page, pageSize, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, Math.trunc(next) || 1));
  }, []);

  const patchItem = useCallback((patch: Partial<AnnouncementDelivery> & { id: number }) => {
    setData((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((item) =>
        item.id === patch.id ? { ...item, ...patch, id: item.id } : item,
      );
      return { ...prev, items };
    });
  }, []);

  const adjustUnread = useCallback((delta: number) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = Math.max(0, prev.unread_count + delta);
      return { ...prev, unread_count: next };
    });
  }, []);

  return {
    loading,
    initialLoading: loading && data === null,
    fetching: loading && data !== null,
    data,
    error,
    reload,
    setPage,
    page,
    patchItem,
    adjustUnread,
  };
}
