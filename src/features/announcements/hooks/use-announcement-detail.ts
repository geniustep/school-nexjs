'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useActiveRole } from '@/features/auth/active-role-context';
import {
  fetchAnnouncementDetail,
  markAnnouncementRead,
} from '@/features/announcements/api/announcements-api';
import type { AnnouncementDelivery } from '@/types/announcement-delivery';
import type { ApiErrorBody } from '@/types/api';

export type AnnouncementDetailState = {
  loading: boolean;
  initialLoading: boolean;
  data: AnnouncementDelivery | null;
  error: ApiErrorBody | null;
  markReadError: ApiErrorBody | null;
  markingRead: boolean;
  reload: () => void;
  markRead: () => Promise<boolean>;
};

/**
 * Detail + optional mark-read. Opening alone is not treated as read until POST succeeds.
 */
export function useAnnouncementDetail(
  messageId: number | null,
  opts?: {
    studentId?: number;
    /** When true, attempt mark-read once after a successful unread detail load. */
    autoMarkRead?: boolean;
  },
): AnnouncementDetailState {
  const { activeRole } = useActiveRole();
  const studentId = opts?.studentId;
  const autoMarkRead = opts?.autoMarkRead !== false;
  const [nonce, setNonce] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnnouncementDelivery | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [markReadError, setMarkReadError] = useState<ApiErrorBody | null>(null);
  const [markingRead, setMarkingRead] = useState(false);
  const generationRef = useRef(0);
  const markInFlightRef = useRef(false);
  const markAttemptedRef = useRef(false);

  useEffect(() => {
    setData(null);
    setError(null);
    setMarkReadError(null);
    markAttemptedRef.current = false;
    markInFlightRef.current = false;
    generationRef.current += 1;
  }, [activeRole, studentId, messageId]);

  useEffect(() => {
    if (messageId == null || !Number.isFinite(messageId) || messageId <= 0) {
      setLoading(false);
      setData(null);
      setError({ code: 'not_found', message: 'Announcement not found.', details: {} });
      return;
    }

    const gen = ++generationRef.current;
    let active = true;
    setLoading(true);
    setError(null);

    fetchAnnouncementDetail(messageId, { student_id: studentId }).then((res) => {
      if (!active || gen !== generationRef.current) return;
      if (res.ok) {
        setData(res.data);
        setError(null);
      } else {
        setData(null);
        setError(res.error);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [activeRole, studentId, messageId, nonce]);

  const markRead = useCallback(async (): Promise<boolean> => {
    if (messageId == null || messageId <= 0) return false;
    if (markInFlightRef.current) return false;
    if (data?.is_read) return true;

    const gen = generationRef.current;
    markInFlightRef.current = true;
    setMarkingRead(true);
    setMarkReadError(null);

    const res = await markAnnouncementRead(messageId, { student_id: studentId });

    if (gen !== generationRef.current) {
      markInFlightRef.current = false;
      setMarkingRead(false);
      return false;
    }

    let ok = false;
    if (res.ok && res.data.is_read) {
      ok = true;
      setData((prev) => (prev && prev.id === messageId ? { ...prev, is_read: true } : prev));
      setMarkReadError(null);
    } else if (!res.ok) {
      setMarkReadError(res.error);
    }

    markInFlightRef.current = false;
    setMarkingRead(false);
    return ok;
  }, [messageId, studentId, data?.is_read]);

  // Auto mark-read after successful detail — still requires Backend POST success.
  useEffect(() => {
    if (!autoMarkRead) return;
    if (loading || !data || data.is_read) return;
    if (markAttemptedRef.current || markInFlightRef.current) return;
    markAttemptedRef.current = true;
    void markRead();
  }, [autoMarkRead, loading, data, markRead]);

  const reload = useCallback(() => {
    markAttemptedRef.current = false;
    setNonce((n) => n + 1);
  }, []);

  return {
    loading,
    initialLoading: loading && data === null,
    data,
    error,
    markReadError,
    markingRead,
    reload,
    markRead,
  };
}
