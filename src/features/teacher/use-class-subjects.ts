'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { Ref } from '@/types/api';

export type ClassSubjectsStatus = 'loading' | 'ready' | 'empty' | 'blocked';

export interface UseClassSubjectsResult {
  subjects: Ref[];
  loading: boolean;
  /** User-facing hint or error message; null when subjects loaded successfully. */
  statusMessage: string | null;
  /** True when the form must not submit (403, 404, network, etc.). */
  blocked: boolean;
  /** True when API returned 200 with an empty subject list. */
  empty: boolean;
  status: ClassSubjectsStatus;
}

export function useClassSubjects(classId: number): UseClassSubjectsResult {
  const t = useT();
  const [subjects, setSubjects] = useState<Ref[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSubjects([]);
    setStatusMessage(null);
    setBlocked(false);
    setEmpty(false);

    api.get<Ref[]>(endpoints.teacher.classSubjects(classId)).then((res) => {
      if (!active) return;

      if (res.success) {
        const list = [...(res.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
        setSubjects(list);
        if (list.length === 0) {
          setEmpty(true);
          setStatusMessage(t('teacher.subjectsEmpty'));
        }
        return;
      }

      const { code, message } = res.error;
      if (code === 'permission_denied') {
        setStatusMessage(t('teacher.classNotAssigned'));
        setBlocked(true);
      } else if (code === 'not_found') {
        setStatusMessage(t('teacher.classNotFound'));
        setBlocked(true);
      } else if (code === 'network_error') {
        setStatusMessage(t('errors.network'));
        setBlocked(true);
      } else {
        setStatusMessage(message || t('errors.serverErrorTitle'));
        setBlocked(true);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [classId, t]);

  const status: ClassSubjectsStatus = loading
    ? 'loading'
    : blocked
      ? 'blocked'
      : empty
        ? 'empty'
        : 'ready';

  return useMemo(
    () => ({ subjects, loading, statusMessage, blocked, empty, status }),
    [subjects, loading, statusMessage, blocked, empty, status],
  );
}
