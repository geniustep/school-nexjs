'use client';

import { useCallback, useMemo } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { ListParams } from '@/types/api';
import type {
  FinanceCommandCenterAging,
  FinanceCommandCenterAttention,
  FinanceCommandCenterPerformance,
  FinanceCommandCenterSummary,
} from '@/types/finance-command-center';
import {
  resolveCommandCenterPerformanceQuery,
  type FinanceCommandCenterPeriodState,
} from './command-center-contract';

export function useFinanceCommandCenter(period: FinanceCommandCenterPeriodState) {
  const { activeSchoolId, activeAcademicYearId } = useAdminSession();

  const baseQuery = useMemo<ListParams | undefined>(
    () =>
      activeAcademicYearId
        ? { academic_year_id: activeAcademicYearId }
        : undefined,
    [activeAcademicYearId],
  );

  const economics = useAdminResource<unknown>(
    activeSchoolId && activeAcademicYearId ? endpoints.admin.financeSchoolYearEnrollmentEconomics : null,
    baseQuery,
    { keepPreviousData: false },
  );

  const summary = useAdminResource<FinanceCommandCenterSummary>(
    activeAcademicYearId ? endpoints.admin.financeCommandCenterSummary : null,
    baseQuery,
    { keepPreviousData: false },
  );

  const performanceQuery = useMemo(
    () =>
      resolveCommandCenterPerformanceQuery(
        activeAcademicYearId,
        period,
        summary.data?.meta.as_of_date,
      ),
    [activeAcademicYearId, period, summary.data?.meta.as_of_date],
  );

  const performance = useAdminResource<FinanceCommandCenterPerformance>(
    performanceQuery ? endpoints.admin.financeCommandCenterCollectionPerformance : null,
    performanceQuery ?? undefined,
    // Global school/year changes must never display the previous context while refetching.
    { keepPreviousData: false },
  );

  const aging = useAdminResource<FinanceCommandCenterAging>(
    activeAcademicYearId ? endpoints.admin.financeCommandCenterAging : null,
    baseQuery,
    { keepPreviousData: false },
  );

  const attention = useAdminResource<FinanceCommandCenterAttention>(
    activeAcademicYearId ? endpoints.admin.financeCommandCenterAttention : null,
    baseQuery,
    { keepPreviousData: false },
  );

  const refresh = useCallback(() => {
    economics.reload();
    summary.reload();
    performance.reload();
    aging.reload();
    attention.reload();
  }, [economics.reload, summary.reload, performance.reload, aging.reload, attention.reload]);

  return {
    economics,
    summary,
    performance,
    aging,
    attention,
    refresh,
    refreshing:
      economics.fetching ||
      summary.fetching ||
      performance.fetching ||
      aging.fetching ||
      attention.fetching,
  };
}
