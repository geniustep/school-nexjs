'use client';

import { useMemo } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { FinancialAgreement } from '../types';
import { normalizeFinancialAgreement } from '../utils/normalize-financial-agreement-line';

export function useFinancialAgreement(agreementId: number | null, enabled = true) {
  const state = useAdminResource<FinancialAgreement>(
    enabled && agreementId ? endpoints.admin.financialAgreement(agreementId) : null,
  );

  const data = useMemo(
    () => (state.data ? normalizeFinancialAgreement(state.data) : null),
    [state.data],
  );

  return { ...state, data };
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
