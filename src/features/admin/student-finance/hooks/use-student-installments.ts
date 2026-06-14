'use client';

import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { InstallmentListParams, StudentInstallment } from '../types';

export function useStudentInstallments(
  studentId: number | string,
  query: InstallmentListParams,
  enabled = true,
) {
  return useAdminResource<StudentInstallment[]>(
    enabled ? endpoints.admin.studentInstallments(studentId) : null,
    query,
  );
}
