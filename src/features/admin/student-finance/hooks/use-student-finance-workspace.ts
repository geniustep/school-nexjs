'use client';

import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { ListParams } from '@/types/api';
import type { StudentFinanceWorkspace } from '../types';

export function useStudentFinanceWorkspace(
  studentId: number | string,
  query?: ListParams,
  enabled = true,
) {
  return useAdminResource<StudentFinanceWorkspace>(
    enabled ? endpoints.admin.studentFinanceWorkspace(studentId) : null,
    query,
  );
}
