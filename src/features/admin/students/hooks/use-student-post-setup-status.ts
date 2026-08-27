'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  isPostSetupComplete,
  type StudentPostSetupStatus,
} from '../utils/student-post-setup';

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 40;

export function useStudentPostSetupStatus(studentId: string, enabled: boolean) {
  const [data, setData] = useState<StudentPostSetupStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    setTimedOut(false);
    setNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      setTimedOut(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let polls = 0;

    async function load() {
      if (cancelled) return;
      setLoading((current) => current || data == null);
      const res = await api.get<StudentPostSetupStatus>(
        `${endpoints.admin.student(studentId)}/post-registration-setup`,
      );
      if (cancelled) return;

      polls += 1;
      setLoading(false);

      if (res.success && res.data) {
        setData(res.data);
        setError(null);
        if (isPostSetupComplete(res.data)) return;
      } else if (!res.success) {
        setError(res.error.message);
      }

      if (polls >= MAX_POLLS) {
        setTimedOut(true);
        return;
      }

      timer = setTimeout(load, res.success ? POLL_INTERVAL_MS : POLL_INTERVAL_MS * 2);
    }

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [studentId, enabled, nonce]);

  return { data, loading, error, timedOut, reload };
}
