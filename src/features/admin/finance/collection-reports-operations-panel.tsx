'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Operational presentation for collection reports. Backend financial totals and
 * aggregation semantics remain authoritative; this component only reorganizes
 * already-supported filters and data.
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
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
import {
  collectionReportsPresetUpdates,
  collectionReportsRangeIsInverted,
  filterCollectionReportClasses,
  filterCollectionReportLevels,
  resolveCollectionReportsDatePreset,
  type CollectionReportsDatePreset,
} from '@/features/admin/finance/utils/collection-reports-ux';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
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
import '@/features/admin/finance/collection-reports-operations.css';

type CollectionReportsPanelProps = {
  filters: CollectionReportsFilters;
  onFiltersChange: (
    updates: Partial<Record<keyof CollectionReportsFilters, string | number | null>>,
  ) => void;
};

type FilterChip = {
  key: string;
  label: string;
  onClear: () => void;
};

const AGG_DIMENSIONS: CollectionReportAggDimension[] = [
  'cycle',
  'level',
  'class',
  'service',
  'payment_method',
];

const DATE_PRESETS: Exclude<CollectionReportsDatePreset, 'custom'>[] = [
  'today',
  'yesterday',
  'week',
  'month',
];

const UX_COPY = {
  ar: {
    today: 'اليوم',
    yesterday: 'أمس',
    week: 'هذا الأسبوع',
    month: 'هذا الشهر',
    custom: 'فترة مخصصة',
    moreFilters: 'فلاتر إضافية',
    activeFilters: 'الفلاتر النشطة',
    clearAll: 'مسح الكل',
    studentPayer: 'التلميذ والمؤدي',
    academicPath: 'المسار الدراسي',
    receipt: 'الوصل',
    analysis: 'التحليل',
    amountCollected: 'المبلغ المحصل',
    operations: 'عدد العمليات',
    unallocated: 'غير الموزع',
    payers: 'المؤدون',
    academicScope: 'المبلغ المرتبط بالنطاق الأكاديمي المفلتر',
    dateRangeError: 'تاريخ البداية يجب أن يسبق تاريخ النهاية أو يساويه.',
    dateRangeLabel: 'الفترة',
    searchChip: 'بحث',
  },
  en: {
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'This week',
    month: 'This month',
    custom: 'Custom range',
    moreFilters: 'More filters',
    activeFilters: 'Active filters',
    clearAll: 'Clear all',
    studentPayer: 'Student & payer',
    academicPath: 'Academic path',
    receipt: 'Receipt',
    analysis: 'Analysis',
    amountCollected: 'Amount collected',
    operations: 'Transactions',
    unallocated: 'Unallocated',
    payers: 'Payers',
    academicScope: 'Amount linked to the filtered academic scope',
    dateRangeError: 'The start date must be before or equal to the end date.',
    dateRangeLabel: 'Period',
    searchChip: 'Search',
  },
  fr: {
    today: "Aujourd’hui",
    yesterday: 'Hier',
    week: 'Cette semaine',
    month: 'Ce mois',
    custom: 'Période personnalisée',
    moreFilters: 'Filtres supplémentaires',
    activeFilters: 'Filtres actifs',
    clearAll: 'Tout effacer',
    studentPayer: 'Élève et payeur',
    academicPath: 'Parcours scolaire',
    receipt: 'Reçu',
    analysis: 'Analyse',
    amountCollected: 'Montant encaissé',
    operations: 'Opérations',
    unallocated: 'Non affecté',
    payers: 'Payeurs',
    academicScope: 'Montant lié au périmètre scolaire filtré',
    dateRangeError: 'La date de début doit précéder ou être égale à la date de fin.',
    dateRangeLabel: 'Période',
    searchChip: 'Recherche',
  },
  es: {
    today: 'Hoy',
    yesterday: 'Ayer',
    week: 'Esta semana',
    month: 'Este mes',
    custom: 'Periodo personalizado',
    moreFilters: 'Filtros adicionales',
    activeFilters: 'Filtros activos',
    clearAll: 'Limpiar todo',
    studentPayer: 'Alumno y pagador',
    academicPath: 'Trayectoria académica',
    receipt: 'Recibo',
    analysis: 'Análisis',
    amountCollected: 'Importe cobrado',
    operations: 'Operaciones',
    unallocated: 'Sin asignar',
    payers: 'Pagadores',
    academicScope: 'Importe vinculado al ámbito académico filtrado',
    dateRangeError: 'La fecha inicial debe ser anterior o igual a la fecha final.',
    dateRangeLabel: 'Periodo',
    searchChip: 'Búsqueda',
  },
} as const;

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
    <div className="finance-collection-reports__kpi finance-collection-reports-ops__kpi">
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

export function CollectionReportsOperationsPanel({
  filters,
  onFiltersChange,
}: CollectionReportsPanelProps) {
  const t = useT();
  const { locale } = useLocale();
  const copy = UX_COPY[locale];
  const { formatDate } = useFormat();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [dateFromDraft, setDateFromDraft] = useState(filters.dateFrom);
  const [dateToDraft, setDateToDraft] = useState(filters.dateTo);

  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  useEffect(() => {
    setDateFromDraft(filters.dateFrom);
    setDateToDraft(filters.dateTo);
  }, [filters.dateFrom, filters.dateTo]);

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

  const allLevels = levelsState.data ?? [];
  const levels = useMemo(
    () => filterCollectionReportLevels(allLevels, filters.cycle),
    [allLevels, filters.cycle],
  );
  const classes = useMemo(
    () =>
      filterCollectionReportClasses(classesState.data ?? [], {
        cycle: filters.cycle,
        levelId: filters.levelId,
      }),
    [classesState.data, filters.cycle, filters.levelId],
  );
  const cycles = levelsOptionsState.data?.cycles ?? [];

  const currentDatePreset = resolveCollectionReportsDatePreset(filters);
  const rangeInvalid = collectionReportsRangeIsInverted(dateFromDraft, dateToDraft);
  const secondaryActiveCount = [
    filters.cycle,
    filters.levelId,
    filters.classId,
    filters.academicYearId,
  ].filter((value) => value.trim()).length;

  const returnTo = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  function resetDateToToday() {
    const update = collectionReportsPresetUpdates('today');
    setDateFromDraft('');
    setDateToDraft('');
    onFiltersChange({ ...update, page: 1 });
  }

  function selectDatePreset(preset: CollectionReportsDatePreset) {
    if (preset === 'custom') {
      const today = collectionReportsPresetUpdates('today').date;
      const from = filters.dateMode === 'range' ? filters.dateFrom || today : filters.date || today;
      const to = filters.dateMode === 'range' ? filters.dateTo || today : filters.date || today;
      setDateFromDraft(from);
      setDateToDraft(to);
      onFiltersChange({ dateMode: 'range', date: '', dateFrom: from, dateTo: to, page: 1 });
      return;
    }
    const update = collectionReportsPresetUpdates(preset);
    setDateFromDraft(update.dateFrom);
    setDateToDraft(update.dateTo);
    onFiltersChange({ ...update, page: 1 });
  }

  function updateCustomRange(nextFrom: string, nextTo: string) {
    setDateFromDraft(nextFrom);
    setDateToDraft(nextTo);
    if (collectionReportsRangeIsInverted(nextFrom, nextTo)) return;
    onFiltersChange({
      dateMode: 'range',
      date: '',
      dateFrom: nextFrom,
      dateTo: nextTo,
      page: 1,
    });
  }

  function resetFilters() {
    const defaults = defaultCollectionReportsFilters();
    setSearchDraft('');
    setDateFromDraft('');
    setDateToDraft('');
    setMoreFiltersOpen(false);
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

  const activeChips: FilterChip[] = useMemo(() => {
    const chips: FilterChip[] = [];
    if (currentDatePreset !== 'today') {
      const dateLabel =
        currentDatePreset === 'custom'
          ? `${copy.dateRangeLabel}: ${filters.dateFrom || '…'} → ${filters.dateTo || '…'}`
          : copy[currentDatePreset];
      chips.push({ key: 'date', label: dateLabel, onClear: resetDateToToday });
    }
    if (filters.search.trim()) {
      chips.push({
        key: 'search',
        label: `${copy.searchChip}: ${filters.search}`,
        onClear: () => {
          setSearchDraft('');
          onFiltersChange({ search: '', page: 1 });
        },
      });
    }
    if (filters.paymentMethod) {
      chips.push({
        key: 'method',
        label: paymentMethodLabel(filters.paymentMethod, t),
        onClear: () => onFiltersChange({ paymentMethod: '', page: 1 }),
      });
    }
    if (filters.serviceId) {
      const service = feeTypes.find((item) => String(item.id) === filters.serviceId);
      chips.push({
        key: 'service',
        label: service?.name ?? filters.serviceId,
        onClear: () => onFiltersChange({ serviceId: '', page: 1 }),
      });
    }
    if (filters.cycle) {
      const cycle = cycles.find((item) => item.code === filters.cycle);
      chips.push({
        key: 'cycle',
        label: cycle?.name ?? filters.cycle,
        onClear: () => onFiltersChange({ cycle: '', levelId: '', classId: '', page: 1 }),
      });
    }
    if (filters.levelId) {
      const level = allLevels.find((item) => String(item.id) === filters.levelId);
      chips.push({
        key: 'level',
        label: level?.name ?? filters.levelId,
        onClear: () => onFiltersChange({ levelId: '', classId: '', page: 1 }),
      });
    }
    if (filters.classId) {
      const klass = (classesState.data ?? []).find((item) => String(item.id) === filters.classId);
      chips.push({
        key: 'class',
        label: klass?.name ?? filters.classId,
        onClear: () => onFiltersChange({ classId: '', page: 1 }),
      });
    }
    if (filters.academicYearId) {
      const year = academicYears.find((item) => String(item.id) === filters.academicYearId);
      chips.push({
        key: 'year',
        label: year?.name ?? filters.academicYearId,
        onClear: () => onFiltersChange({ academicYearId: '', page: 1 }),
      });
    }
    return chips;
  }, [
    academicYears,
    allLevels,
    classesState.data,
    copy,
    currentDatePreset,
    cycles,
    feeTypes,
    filters,
    onFiltersChange,
    t,
  ]);

  const detailColumns: Column<CollectionReportDetailRow>[] = useMemo(
    () => [
      {
        key: 'date',
        header: t('admin.finance.collectionReports.columns.date'),
        render: (row) => (
          <span dir="ltr">{row.payment_date ? formatDate(row.payment_date) : t('common.dash')}</span>
        ),
      },
      {
        key: 'student-payer',
        header: copy.studentPayer,
        render: (row) => (
          <span className="finance-collection-reports-ops__stack" dir="auto">
            {isUnallocatedDetailRow(row) ? (
              <span className="finance-collection-reports__unallocated">
                <span className="finance-collection-reports__unallocated-tag">
                  {t('admin.finance.collectionReports.unallocatedTag')}
                </span>
                <span>{t('admin.finance.collectionReports.unallocatedLabel')}</span>
              </span>
            ) : (
              <strong className="finance-collection-reports-ops__primary-cell">
                {row.student?.display_name ?? t('common.dash')}
                {row.student?.code ? (
                  <span className="muted" dir="ltr"> · {row.student.code}</span>
                ) : null}
              </strong>
            )}
            <span className="finance-collection-reports-ops__secondary-cell">
              {row.payer?.display_name || row.payer?.actual_payer_name || t('common.dash')}
            </span>
          </span>
        ),
      },
      {
        key: 'academic-path',
        header: copy.academicPath,
        render: (row) => {
          if (isUnallocatedDetailRow(row)) {
            return <span className="finance-collection-reports__muted-cell">{t('common.dash')}</span>;
          }
          const parts = [row.cycle?.display_name, row.level?.display_name, row.class?.display_name].filter(
            Boolean,
          );
          return <span dir="auto">{parts.length ? parts.join(' · ') : t('common.dash')}</span>;
        },
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
        render: (row) => <span dir="auto">{paymentMethodLabel(row.payment_method, t)}</span>,
      },
      {
        key: 'amount',
        header: t('admin.finance.collectionReports.columns.amount'),
        render: (row) => (
          <FinanceMoney amount={displayAmountForDetailRow(row)} currency={currency} />
        ),
      },
      {
        key: 'receipt',
        header: copy.receipt,
        render: (row) => {
          const label = row.receipt_number || (row.receipt_id != null ? `#${row.receipt_id}` : '');
          if (!label) return <span className="finance-collection-reports__muted-cell">{t('common.dash')}</span>;
          if (row.receipt_id == null) return <span dir="ltr">{label}</span>;
          const href = `/admin/finance/receipts/${row.receipt_id}?returnTo=${encodeURIComponent(returnTo)}`;
          return (
            <Link
              className="finance-collection-reports-ops__receipt-link"
              href={href}
              title={row.collection_reference || row.receipt_number || undefined}
              dir="ltr"
            >
              {label}
            </Link>
          );
        },
      },
    ],
    [copy.academicPath, copy.receipt, copy.studentPayer, currency, formatDate, returnTo, t],
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
          if (!canDrill) return <span dir="auto">{label}</span>;
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
        render: (row) => <span dir="ltr">{row.distinct_students_count ?? t('common.dash')}</span>,
      },
      {
        key: 'payers',
        header: t('admin.finance.collectionReports.agg.payersCount'),
        render: (row) => <span dir="ltr">{row.distinct_payers_count ?? t('common.dash')}</span>,
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

  if (isInitialLoading) return <LoadingState />;
  if (error) return <ApiErrorView error={error} onRetry={activeState.reload} />;

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
  const paymentMethodRows = aggregations?.aggregations.by_payment_method ?? [];

  return (
    <div className="finance-collection-reports finance-receivable-list finance-collection-reports-ops">
      <div
        className="finance-collection-reports__mode finance-collection-reports-ops__date-presets"
        role="group"
        aria-label={t('admin.finance.collectionReports.dateModeLabel')}
      >
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`finance-collection-reports__seg${currentDatePreset === preset ? ' is-active' : ''}`}
            aria-pressed={currentDatePreset === preset}
            onClick={() => selectDatePreset(preset)}
          >
            {copy[preset]}
          </button>
        ))}
        <button
          type="button"
          className={`finance-collection-reports__seg${currentDatePreset === 'custom' ? ' is-active' : ''}`}
          aria-pressed={currentDatePreset === 'custom'}
          onClick={() => selectDatePreset('custom')}
        >
          {copy.custom}
        </button>
      </div>

      {currentDatePreset === 'custom' ? (
        <div className="finance-collection-reports-ops__custom-range">
          <div className="finance-collection-reports__field">
            <label htmlFor="fcr-date-from">{t('admin.finance.collectionReports.filters.dateFrom')}</label>
            <input
              id="fcr-date-from"
              className="input"
              type="date"
              dir="ltr"
              value={dateFromDraft}
              aria-invalid={rangeInvalid}
              onChange={(event) => updateCustomRange(event.target.value, dateToDraft)}
            />
          </div>
          <div className="finance-collection-reports__field">
            <label htmlFor="fcr-date-to">{t('admin.finance.collectionReports.filters.dateTo')}</label>
            <input
              id="fcr-date-to"
              className="input"
              type="date"
              dir="ltr"
              value={dateToDraft}
              aria-invalid={rangeInvalid}
              onChange={(event) => updateCustomRange(dateFromDraft, event.target.value)}
            />
          </div>
          {rangeInvalid ? (
            <p className="finance-collection-reports-ops__date-error" role="alert">
              {copy.dateRangeError}
            </p>
          ) : null}
        </div>
      ) : null}

      <form
        className="toolbar finance-collection-reports__toolbar finance-collection-reports-ops__primary-filters"
        onSubmit={(event) => {
          event.preventDefault();
          applySearch();
        }}
      >
        <div className="finance-collection-reports__field finance-collection-reports__search">
          <label htmlFor="fcr-search">{t('admin.finance.collectionReports.filters.search')}</label>
          <input
            id="fcr-search"
            className="input"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
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

        <div className="finance-collection-reports__field finance-collection-reports-ops__primary-select">
          <label htmlFor="fcr-method">{t('admin.finance.collectionReports.filters.paymentMethod')}</label>
          <select
            id="fcr-method"
            className="input"
            value={filters.paymentMethod}
            onChange={(event) => onFiltersChange({ paymentMethod: event.target.value, page: 1 })}
          >
            <option value="">{t('admin.finance.collectionReports.filters.allMethods')}</option>
            {COLLECTION_REPORT_PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>{paymentMethodLabel(method, t)}</option>
            ))}
          </select>
        </div>

        <div className="finance-collection-reports__field finance-collection-reports-ops__primary-select">
          <label htmlFor="fcr-service">{t('admin.finance.collectionReports.filters.service')}</label>
          <select
            id="fcr-service"
            className="input"
            value={filters.serviceId}
            onChange={(event) => onFiltersChange({ serviceId: event.target.value, page: 1 })}
          >
            <option value="">{t('admin.finance.collectionReports.filters.allServices')}</option>
            {feeTypes.map((fee) => (
              <option key={fee.id} value={String(fee.id)}>{fee.name}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn btn--ghost btn--sm">
          {t('common.search')}
        </button>
        <button
          type="button"
          className={`btn btn--ghost btn--sm${moreFiltersOpen ? ' is-active' : ''}`}
          aria-expanded={moreFiltersOpen}
          onClick={() => setMoreFiltersOpen((value) => !value)}
        >
          {copy.moreFilters}{secondaryActiveCount ? ` (${secondaryActiveCount})` : ''}
        </button>
      </form>

      {moreFiltersOpen ? (
        <div className="finance-collection-reports-ops__secondary-filters">
          <div className="finance-collection-reports__field">
            <label htmlFor="fcr-cycle">{t('admin.finance.collectionReports.filters.cycle')}</label>
            <select
              id="fcr-cycle"
              className="input"
              value={filters.cycle}
              onChange={(event) =>
                onFiltersChange({ cycle: event.target.value, levelId: '', classId: '', page: 1 })
              }
            >
              <option value="">{t('admin.finance.collectionReports.filters.allCycles')}</option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.code}>{cycle.name}</option>
              ))}
            </select>
          </div>

          <div className="finance-collection-reports__field">
            <label htmlFor="fcr-level">{t('admin.finance.collectionReports.filters.level')}</label>
            <select
              id="fcr-level"
              className="input"
              value={filters.levelId}
              onChange={(event) => onFiltersChange({ levelId: event.target.value, classId: '', page: 1 })}
            >
              <option value="">{t('admin.finance.collectionReports.filters.allLevels')}</option>
              {levels.map((level) => (
                <option key={level.id} value={String(level.id)}>{level.name}</option>
              ))}
            </select>
          </div>

          <div className="finance-collection-reports__field">
            <label htmlFor="fcr-class">{t('admin.finance.collectionReports.filters.class')}</label>
            <select
              id="fcr-class"
              className="input"
              value={filters.classId}
              onChange={(event) => onFiltersChange({ classId: event.target.value, page: 1 })}
            >
              <option value="">{t('admin.finance.collectionReports.filters.allClasses')}</option>
              {classes.map((klass) => (
                <option key={klass.id} value={String(klass.id)}>{klass.name}</option>
              ))}
            </select>
          </div>

          <div className="finance-collection-reports__field">
            <label htmlFor="fcr-year">{t('admin.finance.collectionReports.filters.academicYear')}</label>
            <select
              id="fcr-year"
              className="input"
              value={filters.academicYearId}
              onChange={(event) => onFiltersChange({ academicYearId: event.target.value, page: 1 })}
            >
              <option value="">{t('admin.finance.collectionReports.filters.allYears')}</option>
              {academicYears.map((year) => (
                <option key={year.id} value={String(year.id)}>{year.name}</option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {activeChips.length ? (
        <div className="finance-collection-reports-ops__active-filters" aria-label={copy.activeFilters}>
          <span className="finance-collection-reports-ops__active-label">{copy.activeFilters}:</span>
          <div className="finance-collection-reports-ops__chips">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="finance-collection-reports-ops__chip"
                onClick={chip.onClear}
                title={t('common.clear')}
              >
                <span dir="auto">{chip.label}</span>
                <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
          <button type="button" className="finance-collection-reports-ops__clear-all" onClick={resetFilters}>
            {copy.clearAll}
          </button>
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="finance-collection-reports__kpis finance-collection-reports-ops__kpis" aria-live="polite">
            <SummaryKpi
              label={copy.amountCollected}
              amount={summary.total_confirmed_collections_amount}
              currency={currency}
            />
            <SummaryKpi label={copy.operations} count={summary.collections_count} />
            <SummaryKpi label={copy.unallocated} amount={summary.unallocated_amount} currency={currency} />
            {summary.distinct_payers_count != null ? (
              <SummaryKpi label={copy.payers} count={summary.distinct_payers_count} />
            ) : null}
          </div>
          {summary.academic_filters_active && summary.scoped_allocated_amount != null ? (
            <div className="finance-collection-reports-ops__scope-summary">
              <span>{copy.academicScope}</span>
              <strong><FinanceMoney amount={summary.scoped_allocated_amount} currency={currency} /></strong>
            </div>
          ) : null}
        </>
      ) : null}

      {paymentMethodRows.length ? (
        <div className="finance-collection-reports-ops__payment-strip" aria-label={t('admin.finance.collectionReports.filters.paymentMethod')}>
          {paymentMethodRows.map((row) => (
            <button
              key={String(row.id ?? row.display_name)}
              type="button"
              className="finance-collection-reports-ops__payment-item"
              onClick={() =>
                onFiltersChange({
                  paymentMethod: row.id == null ? '' : String(row.id),
                  page: 1,
                })
              }
            >
              <span>{paymentMethodLabel(String(row.id ?? row.display_name ?? ''), t)}</span>
              <strong><FinanceMoney amount={primaryAggregationAmount('payment_method', row)} currency={currency} /></strong>
            </button>
          ))}
        </div>
      ) : null}

      {isRefetching ? (
        <p className="finance-collection-reports__fetching" aria-live="polite">
          {t('admin.finance.collectionReports.refetching')}
        </p>
      ) : null}

      <div className="finance-collection-reports__views" role="tablist" aria-label={t('admin.finance.collectionReports.viewLabel')}>
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
          {copy.analysis}
        </button>
      </div>

      <div className={isRefetching ? 'finance-collection-reports__results--fetching' : undefined}>
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
                  rowKey={(row) => `${row.collection_id}-${row.allocation_id ?? 'u'}-${row.row_kind}`}
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
            <h2 className="finance-collection-reports__section-title">{copy.analysis}</h2>
            <div className="finance-collection-reports__dims" role="tablist" aria-label={t('admin.finance.collectionReports.aggDimensionLabel')}>
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
