'use client';

import { useCallback } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeTeacherOptions } from '../utils/teacher-options';
import type { TeacherOptions, TeacherOptionsPayload } from '@/types/teacher';

export function useTeacherOptions(active = true) {
  const state = useAdminResource<TeacherOptionsPayload>(
    active ? endpoints.admin.teachersOptions : null,
  );
  const reload = useCallback(() => state.reload(), [state]);

  return {
    options: normalizeTeacherOptions(state.data),
    loading: state.loading,
    error: state.error,
    reload,
  };
}

export type { TeacherOptions };
