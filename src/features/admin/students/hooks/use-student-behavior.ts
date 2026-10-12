'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import type { ApiErrorBody } from '@/types/api';
import type { BehaviorEventType, StudentBehaviorSnapshot } from '@/types/student-behavior';
import {
  fetchBehaviorEventTypes,
  fetchStudentBehavior,
} from '../api/student-behavior-api';

export interface StudentBehaviorState {
  loading: boolean;
  data: StudentBehaviorSnapshot | null;
  eventTypes: BehaviorEventType[];
  error: ApiErrorBody | null;
  reload: () => void;
}

export function useStudentBehavior(
  studentId: string | number | null,
  enabled: boolean,
): StudentBehaviorState {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StudentBehaviorSnapshot | null>(null);
  const [eventTypes, setEventTypes] = useState<BehaviorEventType[]>([]);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    if (!enabled || !studentId || studentId === 'new') {
      setLoading(false);
      setData(null);
      setEventTypes([]);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchStudentBehavior(studentId, activeSchoolId),
      fetchBehaviorEventTypes(activeSchoolId),
    ]).then(([snapshotResponse, catalogResponse]) => {
      if (!active) return;

      if (!snapshotResponse.success) {
        setData(null);
        setEventTypes([]);
        setError(snapshotResponse.error);
        setLoading(false);
        return;
      }

      if (!catalogResponse.success) {
        setData(snapshotResponse.data);
        setEventTypes([]);
        setError(catalogResponse.error);
        setLoading(false);
        return;
      }

      setData(snapshotResponse.data);
      setEventTypes(catalogResponse.data?.items ?? []);
      setError(null);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [studentId, activeSchoolId, enabled, nonce]);

  return { loading, data, eventTypes, error, reload };
}
