'use client';

import { useMemo, useState } from 'react';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import type { StudentDetailsData } from '@/types/student-360';
import { useStudentFinanceWorkspace } from '../hooks/use-student-finance-workspace';
import { resolveFinanceYearId } from '../utils/resolve-finance-year-id';
import {
  resolveFinanceTabLoadPhase,
  shouldShowAgreementEmptyState,
} from '../utils/finance-tab-loading';

export function useStudentFinanceTabState(
  studentId: number,
  details: StudentDetailsData,
  enabled = true,
) {
  const refState = useFinanceReferenceData(enabled);
  const academicYears = refState.academicYears;
  const [selectedYearId, setSelectedYearId] = useState('');

  const effectiveYearId = useMemo(
    () => resolveFinanceYearId(details, academicYears, selectedYearId),
    [details, academicYears, selectedYearId],
  );

  const workspaceQuery = useMemo(
    () => (effectiveYearId ? { academic_year_id: Number(effectiveYearId) } : undefined),
    [effectiveYearId],
  );

  const workspaceState = useStudentFinanceWorkspace(
    studentId,
    workspaceQuery,
    enabled && !!effectiveYearId,
  );

  const workspace = workspaceState.data;
  const phase = resolveFinanceTabLoadPhase({
    yearsLoading: refState.loading,
    effectiveYearId,
    workspaceInitialLoading: workspaceState.initialLoading,
    agreementId: workspace?.current_agreement?.id ?? null,
    agreementDetailInitialLoading: false,
  });

  return {
    refState,
    academicYears,
    effectiveYearId,
    setSelectedYearId,
    workspaceState,
    workspace,
    phase,
    isRefreshing: workspaceState.fetching,
    showAgreementEmpty: shouldShowAgreementEmptyState({
      phase,
      agreement: workspace?.current_agreement ?? null,
      workspaceLoaded: !!workspace && !workspaceState.initialLoading,
    }),
  };
}

export type StudentFinanceTabState = ReturnType<typeof useStudentFinanceTabState>;
