'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { FinanceHubReceivableChart } from '@/features/admin/finance/finance-hub-receivable-chart';
import type { FinanceHubFilterState } from '@/features/admin/finance/finance-hub-period';
import { resolveFinanceHubPeriod } from '@/features/admin/finance/finance-hub-period';
import {
  buildOverviewQueryParams,
  resolveValidYearId,
} from '@/features/admin/finance/finance-hub-scope-utils';
import { FinanceHubSummaryScope } from '@/features/admin/finance/finance-hub-summary-scope';
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
  const { options: yearOptions, loading: yearsLoading } = useAcademicYearOptions(null);
  const [filters, setFilters] = useState<FinanceHubFilterState>(DEFAULT_FILTERS);

  const validYearId = useMemo(
    () => resolveValidYearId(filters.yearId, yearOptions),
    [filters.yearId, yearOptions],
  );

  useEffect(() => {
    if (validYearId !== filters.yearId) {
      setFilters((prev) => ({ ...prev, yearId: validYearId }));
    }
  }, [validYearId, filters.yearId]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, yearId: resolveValidYearId(prev.yearId, yearOptions) }));
  }, [activeSchoolId, yearOptions]);

  const resolvedPeriod = useMemo(() => resolveFinanceHubPeriod(filters), [filters]);
  const overviewParams = useMemo(
    () => buildOverviewQueryParams(validYearId, yearOptions),
    [validYearId, yearOptions],
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

  const handleYearChange = useCallback((yearId: string) => {
    setFilters((prev) => ({ ...prev, yearId }));
  }, []);

  const handlePeriodChange = useCallback((next: FinanceHubFilterState) => {
    setFilters((prev) => ({
      ...next,
      yearId: prev.yearId,
    }));
  }, []);

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <div className="finance-hub-dashboard">
        <FinanceHubHeader
          currentYear={currentYear ?? null}
          onRefresh={handleRefresh}
          refreshing={overviewState.fetching}
        />

        {schools.length > 1 ? (
          <FinanceHubFilters
            showSchoolFilter
            schools={schools}
            activeSchoolId={activeSchoolId}
            onSchoolChange={handleSchoolChange}
          />
        ) : null}

        {overviewState.error ? (
          <ApiErrorView error={overviewState.error} onRetry={overviewState.reload} />
        ) : (
          <>
            <section className="finance-hub-kpi-section">
              <FinanceHubSummaryScope
                yearId={validYearId}
                onYearChange={handleYearChange}
                yearOptions={yearOptions}
                loading={yearsLoading || overviewState.initialLoading}
              />
              <FinanceHubKpiGrid data={overviewState.data} loading={overviewState.initialLoading} />
              <FinanceHubReceivableChart
                overview={overview}
                currency={currency}
                yearId={validYearId}
                yearOptions={yearOptions}
                yearsLoading={yearsLoading}
              />
            </section>
            <FinanceHubAlerts data={overviewState.data} currency={currency} />
            <FinanceHubCharts
              dateFrom={resolvedPeriod.dateFrom}
              dateTo={resolvedPeriod.dateTo}
              currency={currency}
              filters={filters}
              onFiltersChange={handlePeriodChange}
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
