'use client';

import { useMemo } from 'react';
import { useResource, type ResourceState } from '@/lib/hooks/use-resource';
import { useAdminSession } from '@/features/auth/admin-session-context';
import type { ListParams } from '@/types/api';

function isAdminApiPath(path: string | null): boolean {
  return !!path && path.startsWith('/admin/');
}

export function useAdminResource<T>(
  path: string | null,
  query?: ListParams,
): ResourceState<T> {
  const { activeSchoolId, requiresActiveSchool, schools, switching } = useAdminSession();
  const allowedSchoolIds = useMemo(() => schools.map((s) => s.id), [schools]);
  const safeActiveSchoolId =
    activeSchoolId != null && allowedSchoolIds.includes(activeSchoolId) ? activeSchoolId : null;

  const mergedQuery = useMemo(() => {
    if (!isAdminApiPath(path) || safeActiveSchoolId == null) return query;
    return { ...query, active_school_id: safeActiveSchoolId };
  }, [path, query, safeActiveSchoolId]);

  const pendingActiveSchool =
    !!path && isAdminApiPath(path) && requiresActiveSchool && safeActiveSchoolId == null;

  const effectivePath = pendingActiveSchool ? null : path;

  const state = useResource<T>(effectivePath, mergedQuery);

  return useMemo(() => {
    const waiting = pendingActiveSchool || switching;
    const loading = state.loading || waiting;
    return {
      ...state,
      loading,
      initialLoading: loading && state.data === null,
      fetching: state.fetching && !waiting,
    };
  }, [pendingActiveSchool, switching, state]);
}
