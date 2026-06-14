'use client';

import { useCallback } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { TeachingAssignment } from '@/types/academic-setup';
import type { ListParams } from '@/types/api';

export function useTeacherAssignments(teacherId: number | null) {
  const query: ListParams | undefined =
    teacherId != null ? { teacher_id: teacherId, page_size: 500 } : undefined;
  const state = useAdminResource<TeachingAssignment[]>(
    teacherId != null ? endpoints.admin.teachingAssignments : null,
    query,
  );
  const reload = useCallback(() => state.reload(), [state]);

  return {
    assignments: state.data ?? [],
    loading: state.loading,
    error: state.error,
    reload,
  };
}
