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
  const { activeSchoolId, requiresActiveSchool } = useAdminSession();

  const mergedQuery = useMemo(() => {
    if (!isAdminApiPath(path) || activeSchoolId == null) return query;
    return { ...query, active_school_id: activeSchoolId };
  }, [path, query, activeSchoolId]);

  const effectivePath =
    isAdminApiPath(path) && requiresActiveSchool && activeSchoolId == null ? null : path;

  return useResource<T>(effectivePath, mergedQuery);
}
