'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { ResourceView } from '@/components/states/resource';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { Card } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { StudentFinanceAssignFeeDrawer } from './student-finance-assign-fee-drawer';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { ChequePaymentMarker } from '@/features/admin/finance/cheque-payment-marker';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { downloadFinanceReceipt } from '@/lib/api/finance-receipt';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  collectionState,
  feeBalanceAmount,
  paymentMethodLabel,
  refName,
  studentFeeState,
} from '@/lib/utils/finance';
import type { ListParams } from '@/types/api';
import type { PaymentCollection, StudentFee } from '@/types/finance';
import type { StudentCapabilities, StudentDetailsData } from '@/types/student-360';
import { useStudentFinanceSummary } from '../hooks/use-student-finance-summary';
import { useStudentOptions } from '../hooks/use-student-options';
import { formatFinanceCurrency } from '../utils/student-finance-format';
import { relationshipTypeLabel } from '../utils/relationship-types';
import {
  canAssignStudentFees,
  canCollectStudentPayments,
  canManageStudentBillingProfile,
  canViewStudentPayments,
} from '../utils/resolve-capabilities';
import { Student360CompactEmpty } from './student-360-compact-empty';
import { Student360MetricGrid } from './student-360-metric-grid';
import { Student360SectionHeader } from './student-360-section-header';
import { StudentFinanceFeeDetailDialog } from './student-finance-fee-detail-dialog';
import { StudentFinanceMoney } from './student-finance-money';

function resolveInitialAcademicYearId(details: StudentDetailsData, years: { id: number }[]): string {
  const enrollYear = details.current_enrollment?.academic_year;
  if (enrollYear && typeof enrollYear === 'object') return String(enrollYear.id);
  const current = years.find((y) => 'is_current' in y && (y as { is_current?: boolean }).is_current);
  if (current) return String(current.id);
  return years[0] ? String(years[0].id) : '';
}

export function StudentFinanceTab({
  studentId,
  details,
  capabilities,
  onChanged,
  onOpenGuardians,
}: {
  studentId: number;
  details: StudentDetailsData;
  capabilities: StudentCapabilities;
  onChanged: () => void;
  onOpenGuardians?: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const { formatDate } = useFormat();
  const optionsState = useStudentOptions();
  const academicYears = optionsState.options?.academicYears ?? [];
  const [academicYearId, setAcademicYearId] = useState('');
  const [feesPage, setFeesPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [feeDetailId, setFeeDetailId] = useState<number | null>(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [receiptLoadingId, setReceiptLoadingId] = useState<number | null>(null);
  const feesSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!academicYearId && academicYears.length) {
      setAcademicYearId(resolveInitialAcademicYearId(details, academicYears));
    }
  }, [academicYearId, academicYears, details]);

  const summaryState = useStudentFinanceSummary(studentId, academicYearId, true);
  const summary = summaryState.data;
  const currency = summary?.summary.currency;
  const financeCaps = summary?.capabilities;
  const canViewPayments = canViewStudentPayments(capabilities, financeCaps);
  const canCollect = canCollectStudentPayments(capabilities, financeCaps);
  const canAssign = canAssignStudentFees(capabilities, financeCaps);
  const canManageBilling = canManageStudentBillingProfile(capabilities, financeCaps);

  const feesParams: ListParams = {
    page: feesPage,
    page_size: 20,
    academic_year_id: academicYearId ? Number(academicYearId) : undefined,
  };
  const feesState = useAdminResource<StudentFee[]>(
    academicYearId ? endpoints.admin.financeStudentFeesForStudent(studentId) : null,
    feesParams,
  );
  const feesPg = feesState.meta?.pagination;

  const paymentsParams: ListParams = {
    page: paymentsPage,
    page_size: 20,
    student_id: studentId,
    academic_year_id: academicYearId ? Number(academicYearId) : undefined,
  };
  const paymentsState = useAdminResource<PaymentCollection[]>(
    canViewPayments && academicYearId ? endpoints.admin.financePaymentCollections : null,
    paymentsParams,
  );
  const paymentsPg = paymentsState.meta?.pagination;

  const financialRel = useMemo(() => {
    const responsible = summary?.financial_responsible;
    if (!responsible?.relationship_id) return null;
    return details.guardian_relationships.find(
      (r) => r.relationship_id === responsible.relationship_id,
    );
  }, [summary?.financial_responsible, details.guardian_relationships]);

  const mismatch =
    summary?.consistency?.financial_responsible_matches_billing_profile === false;

  const feeColumns: Column<StudentFee>[] = useMemo(
    () => [
      {
        key: 'plan',
        header: t('admin.finance.planOrFeeType'),
        render: (row) => refName(row.fee_plan) ?? refName(row.fee_type) ?? t('common.dash'),
      },
      {
        key: 'original',
        header: t('admin.finance.originalAmount'),
        render: (row) => (
          <FinanceMoney amount={row.original_amount ?? row.amount} currency={row.currency ?? currency?.name} />
        ),
      },
      {
        key: 'discount',
        header: t('admin.finance.discountAmount'),
        render: (row) => <FinanceMoney amount={row.discount_amount} currency={row.currency ?? currency?.name} />,
      },
      {
        key: 'net',
        header: t('admin.finance.netAmount'),
        render: (row) => <FinanceMoney amount={row.net_amount ?? row.amount} currency={row.currency ?? currency?.name} />,
      },
      {
        key: 'paid',
        header: t('admin.finance.paidAmount'),
        render: (row) => <FinanceMoney amount={row.paid_amount} currency={row.currency ?? currency?.name} />,
      },
      {
        key: 'remaining',
        header: t('admin.finance.remainingAmount'),
        render: (row) => <FinanceMoney amount={feeBalanceAmount(row)} currency={row.currency ?? currency?.name} />,
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) => (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <FinanceStatusBadge state={studentFeeState(row)} />
            {(row.cheque || row.paid_by_cheque) && <ChequePaymentMarker fee={row} />}
          </div>
        ),
      },
      {
        key: 'due',
        header: t('admin.finance.dueDate'),
        render: (row) => formatDate(row.due_date ?? row.next_due_date) || t('common.dash'),
      },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setFeeDetailId(row.id)}>
            {t('admin.student360.finance.feeDetails')}
          </button>
        ),
      },
    ],
    [t, formatDate, currency],
  );

  const paymentColumns: Column<PaymentCollection>[] = useMemo(
    () => [
      {
        key: 'reference',
        header: t('admin.finance.reference'),
        render: (row) => <span className="mono">{row.reference ?? row.name ?? `#${row.id}`}</span>,
      },
      {
        key: 'date',
        header: t('common.date'),
        render: (row) => formatDate(row.collection_date ?? row.date) || t('common.dash'),
      },
      {
        key: 'amount',
        header: t('admin.finance.collectionAmount'),
        render: (row) => <FinanceMoney amount={row.amount ?? row.total_amount} currency={currency?.name} />,
      },
      {
        key: 'method',
        header: t('admin.finance.paymentMethod'),
        render: (row) => paymentMethodLabel(row.payment_method, t),
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) => <FinanceStatusBadge state={collectionState(row)} />,
      },
      {
        key: 'collector',
        header: t('admin.student360.finance.collector'),
        render: (row) => refName(row.created_by ?? row.user) ?? t('common.dash'),
      },
      {
        key: 'receipt',
        header: t('admin.student360.finance.receipt'),
        render: (row) => (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={receiptLoadingId === row.id}
            onClick={async () => {
              setReceiptLoadingId(row.id);
              const ref = row.reference ?? row.name ?? String(row.id);
              const result = await downloadFinanceReceipt(row.id, `receipt-${ref}.pdf`);
              setReceiptLoadingId(null);
              if (!result.ok) {
                toast.error(t(result.message ?? 'errors.attachmentFailed'));
              }
            }}
          >
            {receiptLoadingId === row.id ? t('common.loading') : t('admin.student360.finance.openReceipt')}
          </button>
        ),
      },
    ],
    [t, formatDate, currency, receiptLoadingId, toast],
  );

  const yearError =
    summaryState.error?.code === 'academic_year_not_found' ||
    summaryState.error?.code === 'academic_year_out_of_scope';

  if (summaryState.loading && !summary) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (summaryState.error?.code === 'forbidden') {
    return (
      <Student360CompactEmpty
        title={t('admin.student360.finance.forbidden')}
        description={t('admin.student360.finance.forbiddenDesc')}
      />
    );
  }

  function handleAssignSuccess() {
    setShowAssignForm(false);
    toast.success(t('admin.student360.finance.assignDrawer.success'));
    summaryState.reload();
    feesState.reload();
    onChanged();
    requestAnimationFrame(() => {
      feesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const classId =
    details.current_enrollment?.class?.id ??
    (typeof details.student.class === 'object' ? details.student.class?.id : undefined);

  const headerActions = (
    <div className="student-finance-header-actions">
      <label className="student-finance-year-select">
        <span className="tiny muted">{t('admin.student360.finance.academicYear')}</span>
        <select
          className="input"
          value={academicYearId}
          onChange={(e) => {
            setAcademicYearId(e.target.value);
            setFeesPage(1);
            setPaymentsPage(1);
          }}
          disabled={optionsState.loading || !academicYears.length}
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
        {canCollect ? (
          <Link
            href={`/admin/finance/collections/new?studentId=${studentId}`}
            className="btn btn--primary btn--sm"
          >
            {t('admin.student360.finance.recordPayment')}
          </Link>
        ) : null}
        {canAssign ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowAssignForm(true)}>
            {t('admin.student360.finance.assignFeePlan')}
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="student-finance-tab student-360-tab-panel">
      <Student360SectionHeader
        title={t('admin.student360.finance.pageTitle')}
        description={t('admin.student360.finance.pageDescription')}
        action={headerActions}
      />

      {yearError ? (
        <p className="form-error" role="alert">
          {t(`admin.student360.finance.errors.${summaryState.error!.code}`)}
        </p>
      ) : null}

      {summaryState.error && !yearError && summaryState.error.code !== 'forbidden' ? (
        <ApiErrorView error={summaryState.error} onRetry={summaryState.reload} />
      ) : null}

      {summary ? (
        <>
          {(summary.summary.total_overdue ?? 0) > 0 ? (
            <p className="student-finance-alert" role="alert">
              {t('admin.student360.finance.overdueAlert', {
                amount: formatFinanceCurrency(
                  summary.summary.total_overdue,
                  summary.summary.currency,
                  locale,
                ),
              })}
            </p>
          ) : null}

          <section className="student-360-section">
            <h3 className="student-360-section__title">{t('admin.student360.finance.summarySection')}</h3>
            <Student360MetricGrid
              items={[
                {
                  key: 'assessed',
                  label: t('admin.student360.finance.totalAssessed'),
                  value: (
                    <StudentFinanceMoney
                      amount={summary.summary.total_assessed ?? 0}
                      currency={currency}
                      className="student-360-metric-card__money"
                    />
                  ),
                },
                {
                  key: 'paid',
                  label: t('admin.student360.finance.totalPaid'),
                  value: (
                    <StudentFinanceMoney
                      amount={summary.summary.total_paid ?? 0}
                      currency={currency}
                      className="student-360-metric-card__money"
                    />
                  ),
                },
                {
                  key: 'outstanding',
                  label: t('admin.student360.finance.totalOutstanding'),
                  value: (
                    <StudentFinanceMoney
                      amount={summary.summary.total_outstanding ?? 0}
                      currency={currency}
                      className="student-360-metric-card__money"
                    />
                  ),
                },
                {
                  key: 'overdue',
                  label: t('admin.student360.finance.totalOverdue'),
                  value: (
                    <StudentFinanceMoney
                      amount={summary.summary.total_overdue ?? 0}
                      currency={currency}
                      className="student-360-metric-card__money"
                    />
                  ),
                },
              ]}
            />
            {(summary.summary.total_assessed ?? 0) === 0 &&
            (summary.summary.total_paid ?? 0) === 0 &&
            canAssign ? (
              <p className="student-finance-zero-hint tiny muted">
                {t('admin.student360.finance.noFeesAssignHint')}
              </p>
            ) : null}
          </section>

          <section className="student-360-section">
            <h3 className="student-360-section__title">{t('admin.student360.finance.billingSection')}</h3>
            <div className="student-finance-billing-grid">
              <Card className="student-finance-billing-card">
                <h4 className="student-360-section__subtitle">{t('admin.student360.finance.billingProfile')}</h4>
                {summary.billing_profile ? (
                  <dl className="detail-list">
                    <div>
                      <dt>{t('academic.status')}</dt>
                      <dd>
                        <FinanceStatusBadge state={summary.billing_profile.state ?? 'active'} />
                      </dd>
                    </div>
                    <div>
                      <dt>{t('admin.student360.finance.billingPartyType')}</dt>
                      <dd>{summary.billing_profile.billing_party_type ?? t('common.dash')}</dd>
                    </div>
                    <div>
                      <dt>{t('admin.student360.finance.effectiveFrom')}</dt>
                      <dd>{formatDate(summary.billing_profile.effective_from) || t('common.dash')}</dd>
                    </div>
                    <div>
                      <dt>{t('admin.student360.finance.effectiveTo')}</dt>
                      <dd>{formatDate(summary.billing_profile.effective_to) || t('common.dash')}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="student-finance-card-empty tiny muted">
                    {t('admin.student360.finance.noBillingProfile')}
                  </p>
                )}
                {canManageBilling ? (
                  <Link
                    href={`/admin/finance/students/${studentId}`}
                    className="btn btn--ghost btn--sm student-finance-card-action"
                  >
                    {t('admin.finance.manageBillingProfile')}
                  </Link>
                ) : null}
              </Card>
              <Card className="student-finance-billing-card">
                <h4 className="student-360-section__subtitle">{t('admin.student360.finance.financialResponsible')}</h4>
                {summary.financial_responsible?.name ? (
                  <dl className="detail-list">
                    <div>
                      <dt>{t('admin.fullName')}</dt>
                      <dd>{summary.financial_responsible.name}</dd>
                    </div>
                    {financialRel ? (
                      <div>
                        <dt>{t('admin.student360.relationshipTypeLabel')}</dt>
                        <dd>{relationshipTypeLabel(t, financialRel.relationship_type)}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <p className="student-finance-card-empty tiny muted">
                    {t('admin.student360.finance.noFinancialResponsible')}
                  </p>
                )}
                {mismatch ? (
                  <p className="student-finance-alert student-finance-card-alert" role="alert">
                    {t('admin.student360.finance.responsibleMismatch')}
                  </p>
                ) : null}
                {onOpenGuardians ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm student-finance-card-action"
                    onClick={onOpenGuardians}
                  >
                    {t('admin.student360.tabs.guardians')}
                  </button>
                ) : null}
              </Card>
            </div>
          </section>

          <section className="student-360-section" ref={feesSectionRef}>
            <h3 className="student-360-section__title">{t('admin.student360.finance.feesSection')}</h3>
            <ResourceView state={feesState} loadingLabel={t('common.loading')}>
              {(fees) =>
                fees.length === 0 ? (
                  <Student360CompactEmpty
                    title={t('admin.student360.finance.noFees')}
                    description={canAssign ? t('admin.student360.finance.noFeesAssignHint') : undefined}
                    action={
                      canAssign ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => setShowAssignForm(true)}
                        >
                          {t('admin.student360.finance.assignFeePlan')}
                        </button>
                      ) : undefined
                    }
                  />
                ) : (
                  <Card className="student-360-section-card">
                    <div className="student-360-table-wrap">
                      <DataTable columns={feeColumns} rows={fees} rowKey={(row) => row.id} />
                    </div>
                    {feesPg && feesPg.total_pages > 1 ? (
                      <Pagination
                        page={feesPage}
                        totalPages={feesPg.total_pages}
                        total={feesPg.total ?? fees.length}
                        onPage={setFeesPage}
                      />
                    ) : null}
                  </Card>
                )
              }
            </ResourceView>
          </section>

          {canViewPayments ? (
            <section className="student-360-section">
              <h3 className="student-360-section__title">{t('admin.student360.finance.paymentsSection')}</h3>
              <ResourceView state={paymentsState} loadingLabel={t('common.loading')}>
                {(payments) =>
                  payments.length === 0 ? (
                    <Student360CompactEmpty
                      title={t('admin.student360.finance.noPayments')}
                      action={
                        canCollect ? (
                          <Link
                            href={`/admin/finance/collections/new?studentId=${studentId}`}
                            className="btn btn--ghost btn--sm"
                          >
                            {t('admin.student360.finance.recordPayment')}
                          </Link>
                        ) : undefined
                      }
                    />
                  ) : (
                    <Card className="student-360-section-card">
                      <div className="student-360-table-wrap">
                        <DataTable columns={paymentColumns} rows={payments} rowKey={(row) => row.id} />
                      </div>
                      {paymentsPg && paymentsPg.total_pages > 1 ? (
                        <Pagination
                          page={paymentsPage}
                          totalPages={paymentsPg.total_pages}
                          total={paymentsPg.total ?? payments.length}
                          onPage={setPaymentsPage}
                        />
                      ) : null}
                    </Card>
                  )
                }
              </ResourceView>
            </section>
          ) : null}
        </>
      ) : null}

      <StudentFinanceAssignFeeDrawer
        open={showAssignForm && canAssign}
        studentId={studentId}
        classId={classId}
        initialAcademicYearId={academicYearId}
        onClose={() => setShowAssignForm(false)}
        onAssigned={handleAssignSuccess}
      />

      <StudentFinanceFeeDetailDialog
        feeId={feeDetailId}
        open={feeDetailId != null}
        onClose={() => setFeeDetailId(null)}
      />
    </div>
  );
}
