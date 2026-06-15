'use client';

import { useCallback, useMemo, useState } from 'react';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ApiErrorView } from '@/components/states/states';
import { FinanceHubAlerts } from '@/features/admin/finance/finance-hub-alerts';
import { FinanceHubCashflow } from '@/features/admin/finance/finance-hub-cashflow';
import { FinanceHubCharts } from '@/features/admin/finance/finance-hub-charts';
import { FinanceHubFilters } from '@/features/admin/finance/finance-hub-filters';
import { FinanceHubHeader } from '@/features/admin/finance/finance-hub-header';
import { FinanceHubKpiGrid } from '@/features/admin/finance/finance-hub-kpi-grid';
import { FinanceHubLinks } from '@/features/admin/finance/finance-hub-links';
import type { FinanceHubFilterState } from '@/features/admin/finance/finance-hub-period';
import { resolveFinanceHubPeriod } from '@/features/admin/finance/finance-hub-period';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW } from '@/lib/permissions/finance';
import { normalizeFinanceOverview } from '@/lib/utils/finance-normalize';
import type { AdminFinanceOverview } from '@/types/finance';

const DEFAULT_FILTERS: FinanceHubFilterState = {
  period: 'last_30_days',
  yearId: '',
  dateFrom: '',
  dateTo: '',
};

export default function AdminFinancePage() {
  const { activeSchoolId, schools, setActiveSchool } = useAdminSession();
  const { options: yearOptions } = useAcademicYearOptions(null);
  const [filters, setFilters] = useState<FinanceHubFilterState>(DEFAULT_FILTERS);

  const resolvedPeriod = useMemo(() => resolveFinanceHubPeriod(filters), [filters]);
  const overviewParams = useMemo(
    () => ({
      academic_year_id:
        resolvedPeriod.academicYearId ??
        (filters.yearId ? Number(filters.yearId) : undefined),
      date_from: resolvedPeriod.dateFrom,
      date_to: resolvedPeriod.dateTo,
    }),
    [filters.yearId, resolvedPeriod],
  );

  const overviewState = useAdminResource<AdminFinanceOverview>(
    endpoints.admin.financeOverview,
    overviewParams,
  );
  const overview = normalizeFinanceOverview(overviewState.data);
  const currency = overview?.totals?.currency;

  const currentYear = yearOptions.find(
    (year) => 'is_current' in year && (year as { is_current?: boolean }).is_current,
  );

  const handleRefresh = useCallback(() => {
    overviewState.reload();
  }, [overviewState]);

  const handleSchoolChange = useCallback(
    (schoolId: string) => {
      const parsed = Number(schoolId);
      if (!Number.isNaN(parsed)) void setActiveSchool(parsed);
    },
    [setActiveSchool],
  );

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <div className="finance-hub-dashboard">
        <FinanceHubHeader
          currentYear={currentYear ?? null}
          onRefresh={handleRefresh}
          refreshing={overviewState.fetching}
        />

        <FinanceHubFilters
          filters={filters}
          onChange={setFilters}
          yearOptions={yearOptions}
          showSchoolFilter={schools.length > 1}
          schools={schools}
          activeSchoolId={activeSchoolId}
          onSchoolChange={handleSchoolChange}
        />

        {overviewState.error ? (
          <ApiErrorView error={overviewState.error} onRetry={overviewState.reload} />
        ) : (
          <>
            <FinanceHubKpiGrid data={overviewState.data} loading={overviewState.initialLoading} />
            <FinanceHubAlerts data={overviewState.data} currency={currency} />
            <FinanceHubCharts
              overview={overview}
              dateFrom={resolvedPeriod.dateFrom}
              dateTo={resolvedPeriod.dateTo}
              currency={currency}
            />
            <FinanceHubCashflow
              overviewData={overviewState.data}
              currency={currency}
              asOfDate={overview?.as_of_date}
            />
            <FinanceHubLinks overview={overviewState.data} />
          </>
        )}
      </div>
    </RequireAdminPermission>
  );
}
