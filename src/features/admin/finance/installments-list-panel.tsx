'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { IconWallet } from '@/components/icons/admin-icons';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { InstallmentsAnalyticsWorkspace } from '@/features/admin/finance/installments-analytics-workspace';
import { BillingPartnerScopeChip } from '@/features/admin/finance/billing-partner-scope-chip';
import {
  INSTALLMENT_QUICK_FILTERS,
  installmentQuickFilterLabelKey,
  type InstallmentQuickFilter,
} from '@/features/admin/finance/finance-filter-contracts';
import { InstallmentStatusBadges } from '@/features/admin/student-finance/components/installment-status-badges';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import {
  formatInstallmentListDate,
  INSTALLMENTS_PAGE_SIZE,
  installmentQuickFilterChipLabelKey,
  installmentsListHasActiveQuery,
  parseInstallmentServiceIds,
  resolveInstallmentQuickFilter,
  resolveInstallmentsListEmptyVariant,
  serializeInstallmentServiceIds,
  toggleInstallmentServiceId,
} from '@/features/admin/finance/utils/installments-list-present';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { parseFinanceQuickListResponse } from '@/lib/utils/finance-list-response';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import type { FinanceInstallment } from '@/types/finance';
import type { ListParams } from '@/types/api';
import type { Level, SchoolClass } from '@/types/class';
import '@/features/admin/finance/receivable-lists.css';
import '@/features/admin/finance/installments-workspace.css';

export type InstallmentsListFilters = {
  quick: string;
  search: string;
  academicYearId: string;
  classId: string;
  levelId: string;
  studentId: string;
  billingPartnerId: string;
  serviceId: string;
  dueDateFrom: string;
  dueDateTo: string;
  page: number;
};

type InstallmentsListPanelProps = {
  filters: InstallmentsListFilters;
  onFiltersChange: (updates: Partial<Record<keyof InstallmentsListFilters, string | number | null>>) => void;
  returnTo?: string;
};

const QUICK_TABS = INSTALLMENT_QUICK_FILTERS.filter((q) => q !== 'all');

export function InstallmentsListPanel({ filters, onFiltersChange, returnTo }: InstallmentsListPanelProps) {
  const t = useT();
  const { formatDate } = useFormat();
  const { options: yearOptions } = useAcademicYearOptions(null);
  const [listExpanded, setListExpanded] = useState(false);
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels, { page_size: 200 });
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes, { page_size: 500 });
  const levelOptions = levelsState.data ?? [];
  const classOptions = useMemo(
    () =>
      (classesState.data ?? []).filter(
        (item) => !filters.levelId || String(item.level?.id ?? '') === filters.levelId,
      ),
    [classesState.data, filters.levelId],
  );

  const quickValid = resolveInstallmentQuickFilter(filters.quick);
  const apiError = filters.quick && !quickValid && filters.quick !== '';
  const selectedServiceIds = useMemo(
    () => parseInstallmentServiceIds(filters.serviceId),
    [filters.serviceId],
  );
  const selectedServiceIdSet = useMemo(
    () => new Set(selectedServiceIds),
    [selectedServiceIds],
  );

  const query: ListParams = useMemo(() => {
    const p: ListParams = {
      page: filters.page,
      page_size: INSTALLMENTS_PAGE_SIZE,
      search: filters.search || undefined,
      academic_year_id: filters.academicYearId || undefined,
      class_id: filters.classId || undefined,
      level_id: filters.levelId || undefined,
      student_id: filters.studentId || undefined,
      billing_partner_id: filters.billingPartnerId || undefined,
      service_id: selectedServiceIds.length === 1 ? selectedServiceIds[0] : undefined,
      service_ids: selectedServiceIds.length > 1 ? selectedServiceIds.join(',') : undefined,
      due_date_from: filters.dueDateFrom || undefined,
      due_date_to: filters.dueDateTo || undefined,
    };
    if (quickValid && quickValid !== 'all') p.quick = quickValid;
    return p;
  }, [filters, quickValid, selectedServiceIds]);

  const state = useAdminResource<FinanceInstallment[] | Record<string, unknown>>(
    endpoints.admin.financeInstallments,
    query,
  );
  const parsed = useMemo(() => parseFinanceQuickListResponse<FinanceInstallment>(state.data), [state.data]);
  const rows = parsed.items;
  const summary = parsed.summary;
  const applied = parsed.appliedFilters;
  const serviceFacets = parsed.serviceFacets;
  const timeline = parsed.timeline;
  const attention = parsed.attention;
  const pg = state.meta?.pagination;

  const hasActiveQuery = installmentsListHasActiveQuery(filters);
  const emptyVariant = resolveInstallmentsListEmptyVariant({ hasActiveQuery });
  const isRefetching = state.fetching && !state.initialLoading;
  const quickChipKey = installmentQuickFilterChipLabelKey(quickValid);
  const selectedServices = serviceFacets.filter(
    (facet) => selectedServiceIdSet.has(facet.service_id),
  );

  const columns: Column<FinanceInstallment>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => {
          const sid = row.student_id;
          const label = row.student_name ?? t('common.dash');
          const identity = (
            <span className="installments-table__identity">
              <strong dir="auto">{label}</strong>
              <small>
                <bdi dir="ltr">{row.student_code ?? t('common.dash')}</bdi>
                <span aria-hidden> · </span>
                <span dir="auto">{row.class_name ?? row.level_name ?? t('common.dash')}</span>
              </small>
            </span>
          );
          if (!sid) return identity;
          return (
            <Link href={buildStudentFinanceLink(sid, 'finance', returnTo)} onClick={(e) => e.stopPropagation()}>
              {identity}
            </Link>
          );
        },
      },
      {
        key: 'installment',
        header: t('admin.finance.installments.analytics.service'),
        render: (row) => (
          <span className="installments-table__identity">
            <strong dir="auto">{row.service_name ?? t('common.dash')}</strong>
            <small dir="auto">{row.installment_description ?? row.name ?? t('common.dash')}</small>
          </span>
        ),
      },
      {
        key: 'due_date',
        header: t('admin.finance.installments.columns.dueDate'),
        render: (row) => (
          <span className="finance-receivable-list__date" dir="ltr">
            {formatInstallmentListDate(row.due_date, formatDate, t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'financial_position',
        header: t('admin.finance.installments.analytics.financialPosition'),
        render: (row) => {
          const total = Math.max(row.total_amount ?? row.amount ?? 0, 0);
          const paid = Math.max(row.paid_amount ?? 0, 0);
          const paidPercent = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
          return (
            <span className="installments-table__finance">
              <strong><FinanceMoney amount={total} /></strong>
              <span className="installments-table__progress" aria-hidden>
                <span style={{ width: `${paidPercent}%` }} />
              </span>
              <small>
                {t('admin.finance.installments.columns.paid')}: <FinanceMoney amount={paid} />
                <span aria-hidden> · </span>
                {t('admin.finance.installments.columns.remaining')}: <FinanceMoney amount={row.remaining_amount} />
              </small>
            </span>
          );
        },
      },
      {
        key: 'status',
        header: t('admin.finance.installments.columns.status'),
        render: (row) => (
          <span className="installments-table__status">
            <InstallmentStatusBadges
              paymentStatus={row.payment_status ?? 'unpaid'}
              timingStatus={row.timing_status ?? 'not_applicable'}
            />
            {row.days_overdue != null && row.days_overdue > 0 ? (
              <small>{t('admin.finance.installments.analytics.overdueDays', { count: row.days_overdue })}</small>
            ) : null}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('admin.finance.installments.columns.actions'),
        render: (row) => {
          const sid = row.student_id;
          if (!sid) return t('common.dash');
          return (
            <Link
              href={buildStudentFinanceLink(sid, 'finance', returnTo)}
              className="btn btn--ghost btn--sm"
              onClick={(e) => e.stopPropagation()}
            >
              {t('admin.finance.installments.openDetails')}
            </Link>
          );
        },
      },
    ],
    [t, formatDate, returnTo],
  );

  function setQuick(next: InstallmentQuickFilter | '') {
    onFiltersChange({ quick: next || null, page: 1 });
  }

  function toggleService(serviceId: number) {
    const next = toggleInstallmentServiceId(filters.serviceId, serviceId);
    onFiltersChange({ serviceId: next || null, page: 1 });
  }

  function clearServices() {
    onFiltersChange({ serviceId: null, page: 1 });
  }

  function resetAll() {
    onFiltersChange({
      quick: null,
      search: null,
      academicYearId: null,
      classId: null,
      levelId: null,
      studentId: null,
      billingPartnerId: null,
      serviceId: null,
      dueDateFrom: null,
      dueDateTo: null,
      page: 1,
    });
  }

  const listEmptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        title={t('admin.finance.installments.noMatch.title')}
        description={t('admin.finance.installments.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll}>
            {t('admin.finance.installments.showAll')}
          </button>
        }
      />
    ) : (
      <EmptyState
        title={t('admin.finance.installments.emptyTitle')}
        description={t('admin.finance.installments.emptyDesc')}
      />
    );

  return (
    <div className="finance-receivable-list finance-installments-list">
      {filters.billingPartnerId ? (
        <BillingPartnerScopeChip
          billingPartnerId={filters.billingPartnerId}
          onClear={() => onFiltersChange({ billingPartnerId: null, page: 1 })}
        />
      ) : null}

      {apiError ? (
        <ApiErrorView
          error={{ code: 'invalid_quick_filter', message: t('admin.finance.errors.invalidQuickFilter') }}
        />
      ) : null}

      <section className="installments-smart-filters" aria-label={t('admin.finance.installments.analytics.filtersTitle')}>
        <form
          key={`${filters.search}-${filters.academicYearId}-${filters.levelId}-${filters.classId}-${filters.dueDateFrom}-${filters.dueDateTo}`}
          className="installments-smart-filters__form"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const nextLevelId = String(fd.get('level_id') ?? '');
            onFiltersChange({
              search: String(fd.get('search') ?? '').trim() || null,
              academicYearId: String(fd.get('academic_year_id') ?? '') || null,
              levelId: nextLevelId || null,
              classId: String(fd.get('class_id') ?? '') || null,
              dueDateFrom: String(fd.get('due_date_from') ?? '') || null,
              dueDateTo: String(fd.get('due_date_to') ?? '') || null,
              page: 1,
            });
          }}
        >
          <div className="finance-receivable-list__search">
            <input
              className="input"
              name="search"
              placeholder={t('admin.finance.installments.searchPlaceholder')}
              defaultValue={filters.search}
              dir="auto"
            />
            {filters.search ? (
              <button
                type="button"
                className="finance-receivable-list__search-clear"
                aria-label={t('common.clear')}
                onClick={() => onFiltersChange({ search: null, page: 1 })}
              >
                ×
              </button>
            ) : null}
          </div>
          <select className="input" name="academic_year_id" defaultValue={filters.academicYearId} aria-label={t('admin.finance.installments.analytics.academicYear')}>
            <option value="">{t('admin.finance.installments.filters.allYears')}</option>
            {yearOptions.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
          <select className="input" name="level_id" defaultValue={filters.levelId} aria-label={t('admin.finance.installments.analytics.level')}>
            <option value="">{t('admin.finance.installments.analytics.allLevels')}</option>
            {levelOptions.map((level) => (
              <option key={level.id} value={level.id}>{level.display_name ?? level.name}</option>
            ))}
          </select>
          <select className="input" name="class_id" defaultValue={filters.classId} aria-label={t('admin.finance.installments.analytics.class')}>
            <option value="">{t('admin.finance.installments.analytics.allClasses')}</option>
            {classOptions.map((item) => (
              <option key={item.id} value={item.id}>{item.display_name ?? item.name}</option>
            ))}
          </select>
          <label className="installments-smart-filters__date">
            <span>{t('admin.finance.installments.filters.dueFrom')}</span>
            <input className="input" type="date" name="due_date_from" defaultValue={filters.dueDateFrom} dir="ltr" />
          </label>
          <label className="installments-smart-filters__date">
            <span>{t('admin.finance.installments.filters.dueTo')}</span>
            <input className="input" type="date" name="due_date_to" defaultValue={filters.dueDateTo} dir="ltr" />
          </label>
          <button type="submit" className="btn btn--primary btn--sm">{t('admin.search')}</button>
          {hasActiveQuery ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll}>
              {t('admin.finance.collections.resetFilters')}
            </button>
          ) : null}
        </form>

        <div className="installments-smart-filters__quick">
          <span>{t('admin.finance.installments.analytics.status')}</span>
          <div className="finance-receivable-list__tabs">
            <button type="button" className={`btn btn--ghost btn--sm${!quickValid ? ' is-active' : ''}`} onClick={() => setQuick('')}>
              {t('admin.finance.installments.quick.all')}
            </button>
            {QUICK_TABS.map((key) => (
              <button key={key} type="button" className={`btn btn--ghost btn--sm${quickValid === key ? ' is-active' : ''}`} onClick={() => setQuick(quickValid === key ? '' : key)}>
                {t(installmentQuickFilterLabelKey(key))}
              </button>
            ))}
          </div>
          {applied?.as_of_date ? (
            <span className="installments-smart-filters__as-of">
              {t('admin.finance.installments.asOfDate')} <bdi dir="ltr">{formatInstallmentListDate(String(applied.as_of_date), formatDate, t('common.dash'))}</bdi>
            </span>
          ) : null}
        </div>
      </section>

      {quickChipKey || selectedServiceIds.length || filters.levelId || filters.classId ? (
        <div className="finance-receivable-list__chips installments-smart-filters__chips">
          {quickChipKey ? (
            <span className="finance-receivable-list__chip">
              {t('admin.finance.installments.activeFilterChip', {
                filter: t(quickChipKey),
              })}
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('admin.finance.installments.clearFilter')}
                onClick={() => setQuick('')}
              >
                ×
              </button>
            </span>
          ) : null}
          {selectedServiceIds.map((serviceId) => {
            const service = selectedServices.find((item) => item.service_id === serviceId);
            const serviceLabel = service?.service_name ??
              t('admin.finance.installments.servicesFilter.unknown', { id: serviceId });
            return (
              <span className="finance-receivable-list__chip" key={serviceId}>
                {t('admin.finance.installments.servicesFilter.active', {
                  service: serviceLabel,
                })}
                <button
                  type="button"
                  className="finance-receivable-list__chip-clear"
                  aria-label={t('admin.finance.installments.servicesFilter.clearOne', {
                    service: serviceLabel,
                  })}
                  onClick={() => toggleService(serviceId)}
                >
                  ×
                </button>
              </span>
            );
          })}
          {filters.levelId ? (
            <span className="finance-receivable-list__chip">
              {t('admin.finance.installments.analytics.level')}: {levelOptions.find((level) => String(level.id) === filters.levelId)?.display_name ?? levelOptions.find((level) => String(level.id) === filters.levelId)?.name ?? filters.levelId}
              <button type="button" className="finance-receivable-list__chip-clear" aria-label={t('admin.finance.installments.analytics.clearLevel')} onClick={() => onFiltersChange({ levelId: null, classId: null, page: 1 })}>×</button>
            </span>
          ) : null}
          {filters.classId ? (
            <span className="finance-receivable-list__chip">
              {t('admin.finance.installments.analytics.class')}: {classOptions.find((item) => String(item.id) === filters.classId)?.display_name ?? classOptions.find((item) => String(item.id) === filters.classId)?.name ?? filters.classId}
              <button type="button" className="finance-receivable-list__chip-clear" aria-label={t('admin.finance.installments.analytics.clearClass')} onClick={() => onFiltersChange({ classId: null, page: 1 })}>×</button>
            </span>
          ) : null}
        </div>
      ) : null}

      <InstallmentsAnalyticsWorkspace
        summary={summary}
        serviceFacets={serviceFacets}
        timeline={timeline}
        attention={attention}
        selectedServiceIds={selectedServiceIds}
        resultCount={pg?.total ?? rows.length}
        onToggleService={toggleService}
        onClearServices={clearServices}
        onFocusService={(serviceId) =>
          onFiltersChange({ serviceId: serializeInstallmentServiceIds([serviceId]), page: 1 })
        }
        onQuickFilter={(quick) => setQuick(quick)}
        onOpenServiceOverdue={(serviceId) =>
          onFiltersChange({ serviceId: serializeInstallmentServiceIds([serviceId]), quick: 'overdue_unpaid', page: 1 })
        }
      />

      {isRefetching ? (
        <p className="finance-receivable-list__fetching" aria-live="polite">
          {t('admin.finance.installments.refetching')}
        </p>
      ) : null}

      <section className="installments-work-queue" aria-labelledby="installments-work-queue-title">
        <button
          type="button"
          className="installments-work-queue__head"
          aria-expanded={listExpanded}
          aria-controls="installments-work-queue-results"
          onClick={() => setListExpanded((current) => !current)}
        >
          <span>
            <IconWallet size={19} aria-hidden />
            <strong id="installments-work-queue-title">{t('admin.finance.installments.analytics.workQueue')}</strong>
            <bdi dir="ltr">{pg?.total ?? summary?.total_count ?? rows.length}</bdi>
          </span>
          <span>{listExpanded ? t('admin.finance.installments.analytics.collapseList') : t('admin.finance.installments.analytics.expandList')}</span>
        </button>
        {listExpanded ? (
          <div
            id="installments-work-queue-results"
            className={
              isRefetching
                ? 'finance-receivable-list__results finance-receivable-list__results--fetching'
                : 'finance-receivable-list__results'
            }
            aria-busy={isRefetching || undefined}
          >
            <ResourceView
              state={{ ...state, data: rows as FinanceInstallment[] | null }}
              loadingLabel={t('common.loading')}
              isEmpty={(list) => list.length === 0}
              empty={listEmptyState}
            >
              {(list) => (
                <>
                  <DataTable columns={columns} rows={list} rowKey={(row) => row.id ?? `${row.student_id}-${row.due_date}`} />
                  {pg ? (
                    <Pagination
                      page={pg.page}
                      pageSize={pg.page_size ?? INSTALLMENTS_PAGE_SIZE}
                      totalPages={pg.total_pages}
                      total={pg.total}
                      onPage={(p) => onFiltersChange({ page: p })}
                    />
                  ) : null}
                </>
              )}
            </ResourceView>
          </div>
        ) : null}
      </section>
    </div>
  );
}
