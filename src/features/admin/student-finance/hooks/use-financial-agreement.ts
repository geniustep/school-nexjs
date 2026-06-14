'use client';

import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { FinancialAgreement } from '../types';

export function useFinancialAgreement(agreementId: number | null, enabled = true) {
  return useAdminResource<FinancialAgreement>(
    enabled && agreementId ? endpoints.admin.financialAgreement(agreementId) : null,
  );
}

export function useStudentFinancialAgreements(
  studentId: number | string,
  query?: { academic_year_id?: number; page?: number; page_size?: number },
  enabled = true,
) {
  return useAdminResource<FinancialAgreement[]>(
    enabled ? endpoints.admin.studentFinancialAgreements(studentId) : null,
    query,
  );
}
