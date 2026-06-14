'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { Card } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { CollectionDetailDrawer } from '@/features/admin/finance/collection-detail-drawer';
import { ChequeDetailDrawer } from '@/features/admin/finance/cheque-detail-drawer';
import { StudentCollectionDrawer } from '@/features/admin/finance/student-collection-drawer';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { collectionState, paymentMethodLabel, refName } from '@/lib/utils/finance';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import type { StudentFinanceCapabilities } from '@/types/student-finance';
import type { StudentCapabilities, StudentDetailsData } from '@/types/student-360';
import type { PaymentCollection } from '@/types/finance';
import { Student360CompactEmpty } from '@/features/admin/students/components/student-360-compact-empty';
import { Student360MetricGrid } from '@/features/admin/students/components/student-360-metric-grid';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import {
  canCollectStudentPayments,
  canViewStudentPayments,
} from '@/features/admin/students/utils/resolve-capabilities';
import { useStudentFinanceWorkspace } from '../hooks/use-student-finance-workspace';
import { useStudentInstallments } from '../hooks/use-student-installments';
import type { ServiceSubscription, StudentInstallment, WorkspaceCheque } from '../types';
import { hasFinanceSummaryData } from '../utils/reference-labels';
import { formatPeriodRange } from '../utils/format-period';
import { ChequeDualBadges } from './cheque-dual-badges';
import { InstallmentStatusBadges } from './installment-status-badges';
import { ServiceCategoryDetailsList } from './service-category-details-list';
import { resolveReferenceLabel } from '../utils/reference-labels';
import { subscriptionCategoryDetails } from '../utils/service-category-details';

function resolveInitialYearId(
  details: StudentDetailsData,
  years: { id: number }[],
  workspaceYearId?: number,
): string {
  if (workspaceYearId) return String(workspaceYearId);
  const enrollYear = details.current_enrollment?.academic_year;
  if (enrollYear && typeof enrollYear === 'object') return String(enrollYear.id);
  const current = years.find((y) => 'is_current' in y && (y as { is_current?: boolean }).is_current);
  if (current) return String(current.id);
  return years[0] ? String(years[0].id) : '';
}

export function StudentFinanceOperationsTab({
  studentId,
  details,
  capabilities,
}: {
  studentId: number;
  details: StudentDetailsData;
  capabilities: StudentCapabilities;
  onChanged?: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const refState = useFinanceReferenceData();
  const academicYears = refState.academicYears;
  const [academicYearId, setAcademicYearId] = useState('');
  const [page, setPage] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [timingStatus, setTimingStatus] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [quickOverdueUnpaid, setQuickOverdueUnpaid] = useState(false);
  const [showCollectionDrawer, setShowCollectionDrawer] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [selectedChequeId, setSelectedChequeId] = useState<number | null>(null);

  const workspaceQuery = useMemo(
    () => (academicYearId ? { academic_year_id: Number(academicYearId) } : undefined),
    [academicYearId],
  );
  const workspaceState = useStudentFinanceWorkspace(studentId, workspaceQuery, !!academicYearId);
  const workspace = workspaceState.data;

  useEffect(() => {
    if (academicYearId || !academicYears.length) return;
    const initial = resolveInitialYearId(
      details,
      academicYears,
      workspace?.academic_year?.id,
    );
    if (initial) setAcademicYearId(initial);
  }, [academicYearId, academicYears, details, workspace?.academic_year?.id]);

  const installmentQuery = useMemo(
    () => ({
      page,
      page_size: 20,
      academic_year_id: academicYearId ? Number(academicYearId) : undefined,
      payment_status: paymentStatus || undefined,
      timing_status: quickOverdueUnpaid ? 'overdue' : timingStatus || undefined,
      service_category: serviceCategory || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      exclude_paid: quickOverdueUnpaid ? 1 : undefined,
    }),
    [
      page,
      academicYearId,
      paymentStatus,
      timingStatus,
      serviceCategory,
      dateFrom,
      dateTo,
      quickOverdueUnpaid,
    ],
  );

  const installmentsState = useStudentInstallments(
    studentId,
    installmentQuery,
    !!academicYearId,
  );
  const installmentsPg = installmentsState.meta?.pagination;

  const refreshFinanceData = () => {
    workspaceState.reload();
    installmentsState.reload();
  };
  const financeCaps = workspace?.capabilities as StudentFinanceCapabilities | undefined;
  const canViewPayments = canViewStudentPayments(capabilities, financeCaps);
  const canCollect = canCollectStudentPayments(capabilities, financeCaps);
  const currency = workspace?.summary?.currency;
  const serviceCategories = refState.data?.service_categories ?? [];

  const summaryItems = useMemo(() => {
    const s = workspace?.summary;
    if (!s) return [];
    return [
      { key: 'total_due', label: t('admin.student360.financeOps.totalDue'), value: s.total_due },
      {
        key: 'confirmed_paid',
        label: t('admin.student360.financeOps.confirmedPaid'),
        value: s.confirmed_paid,
        tone: 'green' as const,
      },
      {
        key: 'pending_cheques',
        label: t('admin.student360.financeOps.pendingCheques'),
        value: s.pending_cheques,
        tone: 'blue' as const,
      },
      { key: 'remaining', label: t('admin.student360.financeOps.remaining'), value: s.remaining, tone: 'amber' as const },
      { key: 'uncovered', label: t('admin.student360.financeOps.uncovered'), value: s.uncovered, tone: 'amber' as const },
      { key: 'overdue', label: t('admin.student360.financeOps.overdue'), value: s.overdue, tone: 'red' as const },
    ];
  }, [workspace?.summary, t]);

  const installmentColumns: Column<StudentInstallment>[] = useMemo(
    () => [
      {
        key: 'service',
        header: t('admin.student360.financeOps.columns.service'),
        className: 'student-finance-service-col',
        render: (row) => {
          const name = refName(row.service) ?? t('common.dash');
          return (
            <span className="student-finance-service-name" title={name}>
              {name}
            </span>
          );
        },
      },
      {
        key: 'period',
        header: t('admin.student360.financeOps.columns.period'),
        render: (row) => formatPeriodRange(formatDate, row.period_start, row.period_end),
      },
      {
        key: 'display_from',
        header: t('admin.student360.financeOps.columns.displayFrom'),
        render: (row) => formatDate(row.display_from),
      },
      {
        key: 'due_date',
        header: t('admin.student360.financeOps.columns.dueDate'),
        render: (row) => formatDate(row.due_date),
      },
      {
        key: 'amount',
        header: t('admin.student360.financeOps.columns.amount'),
        render: (row) => <FinanceMoney amount={row.amount} currency={currency?.name} />,
      },
      {
        key: 'paid',
        header: t('admin.student360.financeOps.columns.paid'),
        render: (row) => (
          <FinanceMoney amount={row.confirmed_paid_amount} currency={currency?.name} />
        ),
      },
      {
        key: 'pending_cheque',
        header: t('admin.student360.financeOps.columns.pendingCheque'),
        render: (row) => (
          <FinanceMoney amount={row.pending_cheque_amount} currency={currency?.name} />
        ),
      },
      {
        key: 'remaining',
        header: t('admin.student360.financeOps.columns.remaining'),
        render: (row) => <FinanceMoney amount={row.remaining_amount} currency={currency?.name} />,
      },
      {
        key: 'status',
        header: t('admin.student360.financeOps.columns.status'),
        render: (row) => (
          <InstallmentStatusBadges
            paymentStatus={row.payment_status ?? 'unpaid'}
            timingStatus={row.timing_status ?? 'not_applicable'}
            isVisible={row.is_visible}
          />
        ),
      },
    ],
    [t, formatDate, currency?.name],
  );

  const collectionColumns: Column<PaymentCollection>[] = useMemo(
    () => [
      {
        key: 'date',
        header: t('admin.student360.financeOps.collections.date'),
        render: (row) => formatDate(row.collection_date ?? row.date),
      },
      {
        key: 'amount',
        header: t('admin.student360.financeOps.collections.amount'),
        render: (row) => (
          <FinanceMoney amount={row.amount ?? row.total_amount} currency={row.currency ?? currency?.name} />
        ),
      },
      {
        key: 'method',
        header: t('admin.student360.financeOps.collections.method'),
        render: (row) => paymentMethodLabel(row.payment_method, t),
      },
      {
        key: 'journal',
        header: t('admin.student360.financeOps.collections.journal'),
        render: () => t('common.dash'),
      },
      {
        key: 'payer',
        header: t('admin.student360.financeOps.collections.payer'),
        render: (row) => row.payer_name ?? refName(row.billing_partner) ?? t('common.dash'),
      },
      {
        key: 'state',
        header: t('admin.student360.financeOps.collections.state'),
        render: (row) => <FinanceStatusBadge state={collectionState(row)} />,
      },
    ],
    [t, formatDate, currency?.name],
  );

  const chequeColumns: Column<WorkspaceCheque>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.student360.financeOps.cheques.number'),
        render: (row) => row.number ?? row.name ?? t('common.dash'),
      },
      {
        key: 'bank',
        header: t('admin.student360.financeOps.cheques.bank'),
        render: (row) => row.bank_name ?? refName(row.bank) ?? t('common.dash'),
      },
      {
        key: 'amount',
        header: t('admin.student360.financeOps.cheques.amount'),
        render: (row) => <FinanceMoney amount={row.amount} currency={currency?.name} />,
      },
      {
        key: 'received',
        header: t('admin.student360.financeOps.cheques.received'),
        render: (row) => formatDate(row.received_date ?? row.date_received),
      },
      {
        key: 'due',
        header: t('admin.student360.financeOps.cheques.due'),
        render: (row) => formatDate(row.due_date),
      },
      {
        key: 'status',
        header: t('admin.student360.financeOps.cheques.status'),
        render: (row) => (
          <ChequeDualBadges
            lifecycleState={row.lifecycle_state ?? row.state ?? 'draft'}
            maturityStatus={row.maturity_status}
          />
        ),
      },
    ],
    [t, formatDate, currency?.name],
  );

  const subscriptionColumns: Column<ServiceSubscription>[] = useMemo(
    () => [
      {
        key: 'service',
        header: t('admin.student360.financeOps.subscriptions.service'),
        render: (row) => (
          <div className="student-finance-service-cell">
            <span>{refName(row.service) ?? t('common.dash')}</span>
            <ServiceCategoryDetailsList items={subscriptionCategoryDetails(row)} />
          </div>
        ),
      },
      {
        key: 'tariff',
        header: t('admin.student360.financeOps.subscriptions.tariff'),
        render: (row) => refName(row.tariff) ?? t('common.dash'),
      },
      {
        key: 'period',
        header: t('admin.student360.financeOps.subscriptions.period'),
        render: (row) => formatPeriodRange(formatDate, row.period_start, row.period_end),
      },
      {
        key: 'state',
        header: t('admin.student360.financeOps.subscriptions.state'),
        render: (row) => (
          <FinanceStatusBadge state={row.state ?? 'active'} />
        ),
      },
      {
        key: 'pricing',
        header: t('admin.student360.financeOps.subscriptions.pricing'),
        render: (row) =>
          resolveReferenceLabel(t, 'pricing_method', row.pricing_method ?? '', undefined),
      },
    ],
    [t, formatDate],
  );

  if (workspaceState.loading && !workspace) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (workspaceState.error?.code === 'forbidden') {
    return (
      <Student360CompactEmpty
        title={t('admin.student360.finance.forbidden')}
        description={t('admin.student360.finance.forbiddenDesc')}
      />
    );
  }

  if (workspaceState.error && workspaceState.error.code !== 'forbidden') {
    return <ApiErrorView error={workspaceState.error} onRetry={workspaceState.reload} />;
  }

  const hasInstallmentActivity =
    (workspace?.installments_summary?.upcoming_count ?? 0) > 0 ||
    (workspace?.installments_summary?.overdue_count ?? 0) > 0 ||
    (installmentsState.data?.length ?? 0) > 0;

  const emptyFinance =
    !hasFinanceSummaryData(workspace?.summary) &&
    !hasInstallmentActivity &&
    (workspace?.recent_collections?.length ?? 0) === 0;

  const hasInstallmentFilters =
    !!paymentStatus || !!timingStatus || !!serviceCategory || !!dateFrom || !!dateTo || quickOverdueUnpaid;

  function resetInstallmentFilters() {
    setPaymentStatus('');
    setTimingStatus('');
    setServiceCategory('');
    setDateFrom('');
    setDateTo('');
    setQuickOverdueUnpaid(false);
    setPage(1);
  }

  const headerActions = (
    <div className="student-finance-header-actions">
      <label className="student-finance-year-select">
        <span className="tiny muted">{t('admin.student360.finance.academicYear')}</span>
        <select
          className="input"
          value={academicYearId}
          onChange={(e) => {
            setAcademicYearId(e.target.value);
            setPage(1);
          }}
          disabled={refState.loading || !academicYears.length}
        >
          {!academicYears.length && <option value="">{t('common.loading')}</option>}
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </label>
      <div className="student-finance-header-buttons">
        <Link
          href={`/admin/students/${studentId}?tab=financial-agreement`}
          className="btn btn--ghost btn--sm"
        >
          {t('admin.student360.financeOps.openAgreement')}
        </Link>
        {canCollect ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setShowCollectionDrawer(true)}
          >
            {t('admin.finance.collectionWorkflow.drawerTitle')}
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="student-finance-tab student-360-tab-panel">
      <Student360SectionHeader
        title={t('admin.student360.financeOps.pageTitle')}
        description={t('admin.student360.financeOps.pageDescription')}
        action={headerActions}
      />

      {emptyFinance ? (
        <Student360CompactEmpty
          title={t('admin.student360.financeOps.emptyTitle')}
          description={t('admin.student360.financeOps.emptyDescription')}
        />
      ) : (
        <>
          <Student360MetricGrid
            items={summaryItems.map((item) => ({
              key: item.key,
              label: item.label,
              value: (
                <FinanceMoney amount={item.value} currency={currency?.name} />
              ),
              tone: 'tone' in item ? item.tone : undefined,
            }))}
          />

          <Card className="student-finance-section">
            <Student360SectionHeader
              title={t('admin.student360.financeOps.installmentsTitle')}
              description={t('admin.student360.financeOps.installmentsDescription')}
            />
            <div className="student-finance-filters">
              <label>
                <span className="tiny muted">{t('admin.student360.financeOps.filters.paymentStatus')}</span>
                <select
                  className="input"
                  value={paymentStatus}
                  onChange={(e) => {
                    setPaymentStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t('admin.student360.financeOps.filters.all')}</option>
                  <option value="unpaid">{t('admin.student360.financeOps.paymentStatus.unpaid')}</option>
                  <option value="partially_paid">
                    {t('admin.student360.financeOps.paymentStatus.partially_paid')}
                  </option>
                  <option value="paid">{t('admin.student360.financeOps.paymentStatus.paid')}</option>
                </select>
              </label>
              <label>
                <span className="tiny muted">{t('admin.student360.financeOps.filters.timingStatus')}</span>
                <select
                  className="input"
                  value={timingStatus}
                  disabled={quickOverdueUnpaid}
                  onChange={(e) => {
                    setTimingStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t('admin.student360.financeOps.filters.all')}</option>
                  <option value="hidden">{t('admin.student360.financeOps.timingStatus.hidden')}</option>
                  <option value="upcoming">{t('admin.student360.financeOps.timingStatus.upcoming')}</option>
                  <option value="due">{t('admin.student360.financeOps.timingStatus.due')}</option>
                  <option value="overdue">{t('admin.student360.financeOps.timingStatus.overdue')}</option>
                </select>
              </label>
              <label>
                <span className="tiny muted">{t('admin.student360.financeOps.filters.service')}</span>
                <select
                  className="input"
                  value={serviceCategory}
                  onChange={(e) => {
                    setServiceCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t('admin.student360.financeOps.filters.all')}</option>
                  {serviceCategories.map((cat: { value: string; label: string }) => (
                    <option key={cat.value} value={cat.value}>
                      {resolveReferenceLabel(t, 'service_category', cat.value, serviceCategories)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="tiny muted">{t('admin.student360.financeOps.filters.dateFrom')}</span>
                <input
                  className="input"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label>
                <span className="tiny muted">{t('admin.student360.financeOps.filters.dateTo')}</span>
                <input
                  className="input"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label className="student-finance-quick-filter">
                <input
                  type="checkbox"
                  checked={quickOverdueUnpaid}
                  onChange={(e) => {
                    setQuickOverdueUnpaid(e.target.checked);
                    setPage(1);
                  }}
                />
                <span>{t('admin.student360.financeOps.filters.quickOverdueUnpaid')}</span>
              </label>
              {hasInstallmentFilters ? (
                <button type="button" className="btn btn--ghost btn--sm" onClick={resetInstallmentFilters}>
                  {t('admin.studentsList.resetFilters')}
                </button>
              ) : null}
            </div>

            {installmentsState.loading && !installmentsState.data ? (
              <LoadingState label={t('common.loading')} />
            ) : installmentsState.error ? (
              <ApiErrorView error={installmentsState.error} onRetry={installmentsState.reload} />
            ) : (
              <>
                <div className="student-finance-table-wrap">
                  <DataTable
                    columns={installmentColumns}
                    rows={installmentsState.data ?? []}
                    rowKey={(row) => row.id}
                    stickyHeader
                  />
                </div>
                {installmentsPg && installmentsPg.total_pages > 1 ? (
                  <Pagination
                    page={installmentsPg.page}
                    totalPages={installmentsPg.total_pages}
                    total={installmentsPg.total ?? installmentsState.data?.length ?? 0}
                    onPage={setPage}
                  />
                ) : null}
              </>
            )}
          </Card>

          {canViewPayments && (workspace?.recent_collections?.length ?? 0) > 0 ? (
            <Card className="student-finance-section">
              <Student360SectionHeader
                title={t('admin.student360.financeOps.recentCollectionsTitle')}
                action={
                  <Link
                    href={`/admin/finance/collections?student_id=${studentId}`}
                    className="btn btn--ghost btn--sm"
                  >
                    {t('admin.student360.financeOps.viewAllCollections')}
                  </Link>
                }
              />
              <div className="student-finance-table-wrap">
                <DataTable
                  columns={collectionColumns}
                  rows={workspace?.recent_collections ?? []}
                  rowKey={(row) => row.id}
                  onRowClick={(row) => setSelectedCollectionId(row.id)}
                />
              </div>
            </Card>
          ) : null}

          {(workspace?.recent_cheques?.length ?? 0) > 0 ? (
            <Card className="student-finance-section">
              <Student360SectionHeader title={t('admin.student360.financeOps.chequesTitle')} />
              <div className="student-finance-table-wrap">
                <DataTable
                  columns={chequeColumns}
                  rows={workspace?.recent_cheques ?? []}
                  rowKey={(row) => row.id}
                  onRowClick={(row) => setSelectedChequeId(row.id)}
                />
              </div>
            </Card>
          ) : null}

          {(workspace?.active_service_subscriptions?.length ?? 0) > 0 ? (
            <Card className="student-finance-section">
              <Student360SectionHeader
                title={t('admin.student360.financeOps.subscriptionsTitle')}
              />
              <div className="student-finance-table-wrap">
                <DataTable
                  columns={subscriptionColumns}
                  rows={workspace?.active_service_subscriptions ?? []}
                  rowKey={(row) => row.id}
                />
              </div>
            </Card>
          ) : null}
        </>
      )}

      <StudentCollectionDrawer
        open={showCollectionDrawer}
        studentId={studentId}
        academicYearId={academicYearId ? Number(academicYearId) : undefined}
        onClose={() => setShowCollectionDrawer(false)}
        onSuccess={refreshFinanceData}
      />
      <CollectionDetailDrawer
        open={selectedCollectionId != null}
        collectionId={selectedCollectionId}
        onClose={() => setSelectedCollectionId(null)}
      />
      <ChequeDetailDrawer
        open={selectedChequeId != null}
        chequeId={selectedChequeId}
        onClose={() => setSelectedChequeId(null)}
        onChanged={refreshFinanceData}
      />
    </div>
  );
}
