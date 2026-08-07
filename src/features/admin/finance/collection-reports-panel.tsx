'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useMemo, useState } from 'react';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFinanceReferenceData, useFeeTypeOptions } from '@/features/admin/finance/use-finance-lookups';
import {
  aggregationRowsForDimension,
  buildCollectionReportsAggregationsQuery,
  buildCollectionReportsQuery,
  COLLECTION_REPORT_PAYMENT_METHODS,
  collectionReportsHasActiveQuery,
  defaultCollectionReportsFilters,
  displayAmountForDetailRow,
  drilldownFilterFromAggregation,
  isUnallocatedDetailRow,
  normalizeCollectionReportsAggregationsPayload,
  normalizeCollectionReportsDetailsPayload,
  primaryAggregationAmount,
  resolveCollectionReportsEmptyVariant,
  type CollectionReportsFilters,
} from '@/features/admin/finance/utils/collection-reports-present';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { paymentMethodLabel } from '@/lib/utils/finance';
import type { LevelOptionsPayload } from '@/types/academic-levels';
import type { Level, SchoolClass } from '@/types/class';
import type {
  CollectionReportAggDimension,
  CollectionReportAggregationRow,
  CollectionReportDetailRow,
} from '@/types/finance-collection-reports';
import '@/features/admin/finance/receivable-lists.css';
import '@/features/admin/finance/collection-reports.css';

type CollectionReportsPanelProps = {
  filters: CollectionReportsFilters;
  onFiltersChange: (
    updates: Partial<Record<keyof CollectionReportsFilters, string | number | null>>,
  ) => void;
};

const AGG_DIMENSIONS: CollectionReportAggDimension[] = [
  'cycle',
  'level',
  'class',
  'service',
  'payment_method',
];

function SummaryKpi({
  label,
  amount,
  currency,
  count,
}: {
  label: string;
  amount?: number | null;
  currency?: unknown;
  count?: number | null;
}) {
  return (
    <div className="finance-collection-reports__kpi">
      <span className="finance-collection-reports__kpi-label">{label}</span>
      <strong className="finance-collection-reports__kpi-value">
        {count != null ? (
          <span dir="ltr">{count}</span>
        ) : (
          <FinanceMoney amount={amount ?? 0} currency={currency} />
        )}
      </strong>
    </div>
  );
}

export function CollectionReportsPanel({ filters, onFiltersChange }: CollectionReportsPanelProps) {
  const t = useT();
  const { formatDate } = useFormat();
  const [searchDraft, setSearchDraft] = useState(filters.search);

  const detailsQuery = useMemo(() => buildCollectionReportsQuery(filters), [filters]);
  const aggsQuery = useMemo(() => buildCollectionReportsAggregationsQuery(filters), [filters]);

  const detailsState = useAdminResource<unknown>(
    endpoints.admin.financeCollectionReports,
    detailsQuery,
  );
  const aggsState = useAdminResource<unknown>(
    endpoints.admin.financeCollectionReportsAggregations,
    aggsQuery,
  );

  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels, {
    page: 1,
    page_size: 200,
  });
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes, {
    page: 1,
    page_size: 500,
  });
  const levelsOptionsState = useAdminResource<LevelOptionsPayload>(endpoints.admin.levelsOptions);
  const { academicYears } = useFinanceReferenceData();
  const { feeTypes } = useFeeTypeOptions();

  const details = useMemo(
    () => normalizeCollectionReportsDetailsPayload(detailsState.data),
    [detailsState.data],
  );
  const aggregations = useMemo(
    () => normalizeCollectionReportsAggregationsPayload(aggsState.data),
    [aggsState.data],
  );

  const summary = details?.summary ?? aggregations?.summary ?? null;
  const currency = summary?.currency_name ?? summary?.currency_id;

  const activeState = filters.view === 'details' ? detailsState : aggsState;
  const isInitialLoading = activeState.initialLoading;
  const isRefetching = activeState.fetching && !activeState.initialLoading;
  const error = activeState.error;

  const hasActiveQuery = collectionReportsHasActiveQuery(filters);
  const emptyVariant = resolveCollectionReportsEmptyVariant({ hasActiveQuery });

  const levels = levelsState.data ?? [];
  const classes = useMemo(() => {
    const all = classesState.data ?? [];
    if (!filters.levelId) return all;
    const levelId = Number(filters.levelId);
    return all.filter((klass) => klass.level?.id === levelId);
  }, [classesState.data, filters.levelId]);

  const cycles = levelsOptionsState.data?.cycles ?? [];

  const detailColumns: Column<CollectionReportDetailRow>[] = useMemo(
    () => [
      {
        key: 'date',
        header: t('admin.finance.collectionReports.columns.date'),
        render: (row) => (
          <span dir="ltr">
            {row.payment_date
              ? formatDate(row.payment_date)
              : t('common.dash')}
          </span>
        ),
      },
      {
        key: 'student',
        header: t('admin.finance.collectionReports.columns.student'),
        render: (row) =>
          isUnallocatedDetailRow(row) ? (
            <span className="finance-collection-reports__unallocated">
              <span className="finance-collection-reports__unallocated-tag">
                {t('admin.finance.collectionReports.unallocatedTag')}
              </span>
              <span dir="auto">{t('admin.finance.collectionReports.unallocatedLabel')}</span>
            </span>
          ) : (
            <span dir="auto">
              {row.student?.display_name ?? t('common.dash')}
              {row.student?.code ? (
                <span className="muted" dir="ltr">
                  {' '}
                  · {row.student.code}
                </span>
              ) : null}
            </span>
          ),
      },
      {
        key: 'payer',
        header: t('admin.finance.collectionReports.columns.payer'),
        render: (row) => (
          <span dir="auto">
            {row.payer?.display_name || row.payer?.actual_payer_name || t('common.dash')}
          </span>
        ),
      },
      {
        key: 'cycle',
        header: t('admin.finance.collectionReports.columns.cycle'),
        render: (row) =>
          isUnallocatedDetailRow(row) ? (
            <span className="finance-collection-reports__muted-cell">{t('common.dash')}</span>
          ) : (
            <span dir="auto">{row.cycle?.display_name ?? t('common.dash')}</span>
          ),
      },
      {
        key: 'level',
        header: t('admin.finance.collectionReports.columns.level'),
        render: (row) =>
          isUnallocatedDetailRow(row) ? (
            <span className="finance-collection-reports__muted-cell">{t('common.dash')}</span>
          ) : (
            <span dir="auto">{row.level?.display_name ?? t('common.dash')}</span>
          ),
      },
      {
        key: 'class',
        header: t('admin.finance.collectionReports.columns.class'),
        render: (row) =>
          isUnallocatedDetailRow(row) ? (
            <span className="finance-collection-reports__muted-cell">{t('common.dash')}</span>
          ) : (
            <span dir="auto">{row.class?.display_name ?? t('common.dash')}</span>
          ),
      },
      {
        key: 'service',
        header: t('admin.finance.collectionReports.columns.service'),
        render: (row) =>
          isUnallocatedDetailRow(row) ? (
            <span className="finance-collection-reports__muted-cell">{t('common.dash')}</span>
          ) : (
            <span dir="auto">{row.service?.display_name ?? t('common.dash')}</span>
          ),
      },
      {
        key: 'method',
        header: t('admin.finance.collectionReports.columns.paymentMethod'),
        render: (row) => (
          <span dir="auto">{paymentMethodLabel(row.payment_method, t)}</span>
        ),
      },
      {
        key: 'amount',
        header: t('admin.finance.collectionReports.columns.amount'),
        render: (row) => (
          <FinanceMoney amount={displayAmountForDetailRow(row)} currency={currency} />
        ),
      },
    ],
    [currency, formatDate, t],
  );

  const aggRows = aggregationRowsForDimension(
    aggregations?.aggregations,
    filters.aggDimension,
  );

  const aggColumns: Column<CollectionReportAggregationRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t(`admin.finance.collectionReports.agg.${filters.aggDimension}.name`),
        render: (row) => {
          const label =
            filters.aggDimension === 'payment_method'
              ? paymentMethodLabel(String(row.id ?? row.display_name ?? ''), t)
              : row.display_name || t('common.dash');
          const canDrill = row.id != null && String(row.id) !== '' && String(row.id) !== '0';
          if (!canDrill) {
            return <span dir="auto">{label}</span>;
          }
          return (
            <button
              type="button"
              className="finance-collection-reports__drilldown"
              onClick={() =>
                onFiltersChange(drilldownFilterFromAggregation(filters.aggDimension, row))
              }
              aria-label={t('admin.finance.collectionReports.drilldownAria', { name: label })}
            >
              <span dir="auto">{label}</span>
            </button>
          );
        },
      },
      {
        key: 'collections',
        header: t('admin.finance.collectionReports.agg.collectionsCount'),
        render: (row) => <span dir="ltr">{row.collections_count ?? t('common.dash')}</span>,
      },
      {
        key: 'allocations',
        header: t('admin.finance.collectionReports.agg.allocationsCount'),
        render: (row) => <span dir="ltr">{row.allocations_count ?? t('common.dash')}</span>,
      },
      {
        key: 'students',
        header: t('admin.finance.collectionReports.agg.studentsCount'),
        render: (row) => (
          <span dir="ltr">{row.distinct_students_count ?? t('common.dash')}</span>
        ),
      },
      {
        key: 'payers',
        header: t('admin.finance.collectionReports.agg.payersCount'),
        render: (row) => (
          <span dir="ltr">{row.distinct_payers_count ?? t('common.dash')}</span>
        ),
      },
      {
        key: 'amount',
        header:
          filters.aggDimension === 'payment_method'
            ? t('admin.finance.collectionReports.agg.collectionsAmount')
            : t('admin.finance.collectionReports.agg.allocatedAmount'),
        render: (row) => (
          <FinanceMoney
            amount={primaryAggregationAmount(filters.aggDimension, row)}
            currency={currency}
          />
        ),
      },
    ],
    [currency, filters.aggDimension, onFiltersChange, t],
  );

  function resetFilters() {
    const defaults = defaultCollectionReportsFilters();
    setSearchDraft('');
    onFiltersChange({
      dateMode: defaults.dateMode,
      date: defaults.date,
      dateFrom: '',
      dateTo: '',
      cycle: '',
      levelId: '',
      classId: '',
      serviceId: '',
      paymentMethod: '',
      academicYearId: '',
      search: '',
      page: 1,
    });
  }

  function applySearch() {
    onFiltersChange({ search: searchDraft.trim(), page: 1 });
  }

  if (isInitialLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ApiErrorView error={error} onRetry={activeState.reload} />;
  }

  const detailsEmpty =
    !details?.items.length && filters.view === 'details' ? (
      emptyVariant === 'no-match' ? (
        <EmptyState
          title={t('admin.finance.collectionReports.empty.noMatchTitle')}
          description={t('admin.finance.collectionReports.empty.noMatchDesc')}
          action={
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
              {t('admin.finance.collectionReports.resetFilters')}
            </button>
          }
        />
      ) : (
        <EmptyState
          title={t('admin.finance.collectionReports.empty.noDataTitle')}
          description={t('admin.finance.collectionReports.empty.noDataDesc')}
        />
      )
    ) : null;

  const aggsEmpty =
    filters.view === 'aggregations' && !aggRows.length ? (
      emptyVariant === 'no-match' ? (
        <EmptyState
          title={t('admin.finance.collectionReports.empty.noMatchAggTitle')}
          description={t('admin.finance.collectionReports.empty.noMatchAggDesc')}
          action={
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
              {t('admin.finance.collectionReports.resetFilters')}
            </button>
          }
        />
      ) : (
        <EmptyState
          title={t('admin.finance.collectionReports.empty.noDataAggTitle')}
          description={t('admin.finance.collectionReports.empty.noDataAggDesc')}
        />
      )
    ) : null;

  const pagination = detailsState.meta?.pagination;

  return (
    <div className="finance-collection-reports finance-receivable-list">
      <div
        className="finance-collection-reports__mode"
        role="group"
        aria-label={t('admin.finance.collectionReports.dateModeLabel')}
      >
        <button
          type="button"
          className={`finance-collection-reports__seg${filters.dateMode === 'day' ? ' is-active' : ''}`}
          aria-pressed={filters.dateMode === 'day'}
          onClick={() =>
            onFiltersChange({
              dateMode: 'day',
              date: filters.date || defaultCollectionReportsFilters().date,
              dateFrom: '',
              dateTo: '',
              page: 1,
            })
          }
        >
          {t('admin.finance.collectionReports.dateMode.day')}
        </button>
        <button
          type="button"
          className={`finance-collection-reports__seg${filters.dateMode === 'range' ? ' is-active' : ''}`}
          aria-pressed={filters.dateMode === 'range'}
          onClick={() =>
            onFiltersChange({
              dateMode: 'range',
              date: '',
              dateFrom: filters.dateFrom || filters.date || defaultCollectionReportsFilters().date,
              dateTo: filters.dateTo || filters.date || defaultCollectionReportsFilters().date,
              page: 1,
            })
          }
        >
          {t('admin.finance.collectionReports.dateMode.range')}
        </button>
      </div>

      <form
        className="toolbar finance-collection-reports__toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          applySearch();
        }}
      >
        {filters.dateMode === 'day' ? (
          <div className="finance-collection-reports__field">
            <label htmlFor="fcr-date">{t('admin.finance.collectionReports.filters.date')}</label>
            <input
              id="fcr-date"
              className="input"
              type="date"
              dir="ltr"
              value={filters.date}
              onChange={(e) => onFiltersChange({ date: e.target.value, page: 1 })}
            />
          </div>
        ) : (
          <>
            <div className="finance-collection-reports__field">
              <label htmlFor="fcr-date-from">
                {t('admin.finance.collectionReports.filters.dateFrom')}
              </label>
              <input
                id="fcr-date-from"
                className="input"
                type="date"
                dir="ltr"
                value={filters.dateFrom}
                onChange={(e) => onFiltersChange({ dateFrom: e.target.value, page: 1 })}
              />
            </div>
            <div className="finance-collection-reports__field">
              <label htmlFor="fcr-date-to">
                {t('admin.finance.collectionReports.filters.dateTo')}
              </label>
              <input
                id="fcr-date-to"
                className="input"
                type="date"
                dir="ltr"
                value={filters.dateTo}
                onChange={(e) => onFiltersChange({ dateTo: e.target.value, page: 1 })}
              />
            </div>
          </>
        )}

        <div className="finance-collection-reports__field">
          <label htmlFor="fcr-cycle">{t('admin.finance.collectionReports.filters.cycle')}</label>
          <select
            id="fcr-cycle"
            className="input"
            value={filters.cycle}
            onChange={(e) =>
              onFiltersChange({ cycle: e.target.value, levelId: '', classId: '', page: 1 })
            }
          >
            <option value="">{t('admin.finance.collectionReports.filters.allCycles')}</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.code}>
                {cycle.name}
              </option>
            ))}
          </select>
        </div>

        <div className="finance-collection-reports__field">
          <label htmlFor="fcr-level">{t('admin.finance.collectionReports.filters.level')}</label>
          <select
            id="fcr-level"
            className="input"
            value={filters.levelId}
            onChange={(e) => onFiltersChange({ levelId: e.target.value, classId: '', page: 1 })}
          >
            <option value="">{t('admin.finance.collectionReports.filters.allLevels')}</option>
            {levels.map((level) => (
              <option key={level.id} value={String(level.id)}>
                {level.name}
              </option>
            ))}
          </select>
        </div>

        <div className="finance-collection-reports__field">
          <label htmlFor="fcr-class">{t('admin.finance.collectionReports.filters.class')}</label>
          <select
            id="fcr-class"
            className="input"
            value={filters.classId}
            onChange={(e) => onFiltersChange({ classId: e.target.value, page: 1 })}
          >
            <option value="">{t('admin.finance.collectionReports.filters.allClasses')}</option>
            {classes.map((klass) => (
              <option key={klass.id} value={String(klass.id)}>
                {klass.name}
              </option>
            ))}
          </select>
        </div>

        <div className="finance-collection-reports__field">
          <label htmlFor="fcr-service">{t('admin.finance.collectionReports.filters.service')}</label>
          <select
            id="fcr-service"
            className="input"
            value={filters.serviceId}
            onChange={(e) => onFiltersChange({ serviceId: e.target.value, page: 1 })}
          >
            <option value="">{t('admin.finance.collectionReports.filters.allServices')}</option>
            {feeTypes.map((fee) => (
              <option key={fee.id} value={String(fee.id)}>
                {fee.name}
              </option>
            ))}
          </select>
        </div>

        <div className="finance-collection-reports__field">
          <label htmlFor="fcr-method">
            {t('admin.finance.collectionReports.filters.paymentMethod')}
          </label>
          <select
            id="fcr-method"
            className="input"
            value={filters.paymentMethod}
            onChange={(e) => onFiltersChange({ paymentMethod: e.target.value, page: 1 })}
          >
            <option value="">{t('admin.finance.collectionReports.filters.allMethods')}</option>
            {COLLECTION_REPORT_PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {paymentMethodLabel(method, t)}
              </option>
            ))}
          </select>
        </div>

        <div className="finance-collection-reports__field">
          <label htmlFor="fcr-year">
            {t('admin.finance.collectionReports.filters.academicYear')}
          </label>
          <select
            id="fcr-year"
            className="input"
            value={filters.academicYearId}
            onChange={(e) => onFiltersChange({ academicYearId: e.target.value, page: 1 })}
          >
            <option value="">{t('admin.finance.collectionReports.filters.allYears')}</option>
            {academicYears.map((year) => (
              <option key={year.id} value={String(year.id)}>
                {year.name}
              </option>
            ))}
          </select>
        </div>

        <div className="finance-collection-reports__field finance-collection-reports__search">
          <label htmlFor="fcr-search">{t('admin.finance.collectionReports.filters.search')}</label>
          <input
            id="fcr-search"
            className="input"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder={t('admin.finance.collectionReports.filters.searchPlaceholder')}
            dir="auto"
          />
          {searchDraft || filters.search ? (
            <button
              type="button"
              className="finance-collection-reports__search-clear"
              aria-label={t('common.clear')}
              onClick={() => {
                setSearchDraft('');
                onFiltersChange({ search: '', page: 1 });
              }}
            >
              ×
            </button>
          ) : null}
        </div>

        <button type="submit" className="btn btn--ghost btn--sm">
          {t('common.search')}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
          {t('admin.finance.collectionReports.resetFilters')}
        </button>
      </form>

      {summary ? (
        <div className="finance-collection-reports__kpis" aria-live="polite">
          <SummaryKpi
            label={t('admin.finance.collectionReports.summary.total')}
            amount={summary.total_confirmed_collections_amount}
            currency={currency}
          />
          <SummaryKpi
            label={t('admin.finance.collectionReports.summary.collectionsCount')}
            count={summary.collections_count}
          />
          {summary.distinct_payers_count != null ? (
            <SummaryKpi
              label={t('admin.finance.collectionReports.summary.payersCount')}
              count={summary.distinct_payers_count}
            />
          ) : null}
          <SummaryKpi
            label={t('admin.finance.collectionReports.summary.allocated')}
            amount={summary.allocated_amount}
            currency={currency}
          />
          <SummaryKpi
            label={t('admin.finance.collectionReports.summary.unallocated')}
            amount={summary.unallocated_amount}
            currency={currency}
          />
        </div>
      ) : null}

      {isRefetching ? (
        <p className="finance-collection-reports__fetching" aria-live="polite">
          {t('admin.finance.collectionReports.refetching')}
        </p>
      ) : null}

      <div
        className="finance-collection-reports__views"
        role="tablist"
        aria-label={t('admin.finance.collectionReports.viewLabel')}
      >
        <button
          type="button"
          role="tab"
          aria-selected={filters.view === 'details'}
          className={`finance-collection-reports__seg${filters.view === 'details' ? ' is-active' : ''}`}
          onClick={() => onFiltersChange({ view: 'details' })}
        >
          {t('admin.finance.collectionReports.views.details')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filters.view === 'aggregations'}
          className={`finance-collection-reports__seg${filters.view === 'aggregations' ? ' is-active' : ''}`}
          onClick={() => onFiltersChange({ view: 'aggregations' })}
        >
          {t('admin.finance.collectionReports.views.aggregations')}
        </button>
      </div>

      <div
        className={isRefetching ? 'finance-collection-reports__results--fetching' : undefined}
      >
        {filters.view === 'details' ? (
          <>
            <h2 className="finance-collection-reports__section-title">
              {t('admin.finance.collectionReports.detailsTitle')}
            </h2>
            {detailsEmpty ?? (
              <>
                <DataTable
                  columns={detailColumns}
                  rows={details?.items ?? []}
                  rowKey={(row) =>
                    `${row.collection_id}-${row.allocation_id ?? 'u'}-${row.row_kind}`
                  }
                />
                {pagination ? (
                  <Pagination
                    page={pagination.page}
                    totalPages={pagination.total_pages}
                    total={pagination.total}
                    pageSize={pagination.page_size}
                    onPage={(page) => onFiltersChange({ page })}
                  />
                ) : null}
              </>
            )}
          </>
        ) : (
          <>
            <h2 className="finance-collection-reports__section-title">
              {t('admin.finance.collectionReports.aggregationsTitle')}
            </h2>
            <div
              className="finance-collection-reports__dims"
              role="tablist"
              aria-label={t('admin.finance.collectionReports.aggDimensionLabel')}
            >
              {AGG_DIMENSIONS.map((dim) => (
                <button
                  key={dim}
                  type="button"
                  role="tab"
                  aria-selected={filters.aggDimension === dim}
                  className={`finance-collection-reports__seg${filters.aggDimension === dim ? ' is-active' : ''}`}
                  onClick={() => onFiltersChange({ aggDimension: dim })}
                >
                  {t(`admin.finance.collectionReports.agg.${dim}.tab`)}
                </button>
              ))}
            </div>
            {aggsEmpty ?? (
              <DataTable
                columns={aggColumns}
                rows={aggRows}
                rowKey={(row) => `${filters.aggDimension}-${String(row.id)}`}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
