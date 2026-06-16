'use client';

import { useMemo } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { ListParams } from '@/types/api';
import type { StudentFinanceWorkspace } from '../types';
import { normalizeStudentFinanceWorkspace } from '../utils/normalize-student-finance-workspace';

export function useStudentFinanceWorkspace(
  studentId: number | string,
  query?: ListParams,
  enabled = true,
) {
  const state = useAdminResource<StudentFinanceWorkspace>(
    enabled ? endpoints.admin.studentFinanceWorkspace(studentId) : null,
    query,
  );

  const data = useMemo(
    () => normalizeStudentFinanceWorkspace(state.data),
    [state.data],
  );

  return {
    ...state,
    data,
  };
}
