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
import { FinanceCanonicalKpis } from '@/features/admin/finance/finance-canonical-kpis';
import { FinanceCanonicalPeriodKpis } from '@/features/admin/finance/finance-canonical-period-kpis';
import { parseFinanceCanonicalMetrics, parseFinanceCanonicalPeriodMetrics } from '@/lib/utils/finance-canonical';
import { FinanceHubLinks } from '@/features/admin/finance/finance-hub-links';
import type { FinanceHubFilterState } from '@/features/admin/finance/finance-hub-period';
import { resolveFinanceHubPeriod } from '@/features/admin/finance/finance-hub-period';
import {
  buildOverviewQueryParams,
  resolveValidYearId,
} from '@/features/admin/finance/finance-hub-scope-utils';
import { FinanceHubSummaryScope } from '@/features/admin/finance/finance-hub-summary-scope';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useT } from '@/features/i18n/locale-context';
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
  const { activeSchoolId, activeAcademicYearId, academicYearLoading, schools, setActiveSchool } = useAdminSession();
  const t = useT();
  const { options: yearOptions, loading: yearsLoading } = useAcademicYearOptions(null);
  const [filters, setFilters] = useState<FinanceHubFilterState>(DEFAULT_FILTERS);
  const [yearExplicit, setYearExplicit] = useState(false);

  const validYearId = useMemo(
    () => resolveValidYearId(
      yearExplicit ? filters.yearId : (filters.yearId || String(activeAcademicYearId ?? '')),
      yearOptions,
    ),
    [filters.yearId, yearOptions, activeAcademicYearId, yearExplicit],
  );

  useEffect(() => {
    if (validYearId !== filters.yearId) {
      setFilters((prev) => ({ ...prev, yearId: validYearId }));
    }
  }, [validYearId, filters.yearId]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, yearId: resolveValidYearId(prev.yearId, yearOptions) }));
  }, [activeSchoolId, yearOptions]);

  useEffect(() => {
    setYearExplicit(false);
    setFilters((prev) => ({ ...prev, yearId: '' }));
  }, [activeSchoolId]);

  const resolvedPeriod = useMemo(() => resolveFinanceHubPeriod(filters), [filters]);
  const overviewParams = useMemo(() => {
    const scope = buildOverviewQueryParams(validYearId, yearOptions);
    // The period contract requires a valid year AND both date bounds.
    return scope.academic_year_id && resolvedPeriod.dateFrom && resolvedPeriod.dateTo
      ? { ...scope, date_from: resolvedPeriod.dateFrom, date_to: resolvedPeriod.dateTo }
      : scope;
  }, [validYearId, yearOptions, resolvedPeriod.dateFrom, resolvedPeriod.dateTo]);

  const overviewState = useAdminResource<AdminFinanceOverview>(
    endpoints.admin.financeOverview,
    overviewParams,
    { keepPreviousData: false },
  );
  const overview = normalizeFinanceOverview(overviewState.data);
  const canonical = parseFinanceCanonicalMetrics(overviewState.data?.canonical_metrics, {
    schoolId: activeSchoolId,
    academicYearId: validYearId ? Number(validYearId) : null,
  });
  const canonicalPeriod = parseFinanceCanonicalPeriodMetrics(
    overviewState.data?.canonical_period_metrics,
    {
      schoolId: activeSchoolId,
      academicYearId: validYearId ? Number(validYearId) : null,
      dateFrom: resolvedPeriod.dateFrom,
      dateTo: resolvedPeriod.dateTo,
    },
  );
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
    setYearExplicit(true);
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
              {overviewState.initialLoading || academicYearLoading ? (
                <div className="card" aria-busy="true" />
              ) : validYearId ? (
                <>
                  <FinanceCanonicalKpis
                    metrics={canonical}
                    yearLabel={yearOptions.find((y) => String(y.id) === validYearId)?.name}
                  />
                  <FinanceCanonicalPeriodKpis metrics={canonicalPeriod} />
                </>
              ) : (
                <p className="card" role="status">{t('admin.finance.canonical.chooseYear')}</p>
              )}
            </section>
            <FinanceHubAlerts data={overviewState.data} currency={currency} />
            <FinanceHubCharts
              dateFrom={resolvedPeriod.dateFrom}
              dateTo={resolvedPeriod.dateTo}
              currency={currency}
              filters={filters}
              onFiltersChange={handlePeriodChange}
              overview={overview}
              yearId={validYearId}
              yearOptions={yearOptions}
              yearsLoading={yearsLoading}
              overviewLoading={overviewState.initialLoading}
            />
            <FinanceHubCashflow overviewData={overviewState.data} currency={currency} />
            <FinanceHubLinks overview={overviewState.data} />
          </>
        )}
      </div>
    </RequireAdminPermission>
  );
}
