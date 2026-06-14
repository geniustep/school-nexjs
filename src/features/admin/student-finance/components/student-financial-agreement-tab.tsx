'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { Card } from '@/components/ui/primitives';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { refName } from '@/lib/utils/finance';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import type { StudentCapabilities, StudentDetailsData } from '@/types/student-360';
import type { FinancialAgreement } from '../types';
import { Student360CompactEmpty } from '@/features/admin/students/components/student-360-compact-empty';
import { Student360MetricGrid } from '@/features/admin/students/components/student-360-metric-grid';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import { relationshipTypeLabel } from '@/features/admin/students/utils/relationship-types';
import {
  postAgreementAction,
} from '../api/finance-admin-api';
import { AgreementCreateDrawer } from './agreement-create-drawer';
import { CancelFutureInstallmentsDrawer } from './cancel-future-installments-drawer';
import { ServiceCategoryDetailsList } from './service-category-details-list';
import { AgreementStateBadge } from './agreement-state-badge';
import { ScheduleItemStateBadge } from './cheque-dual-badges';
import { useFinancialAgreement } from '../hooks/use-financial-agreement';
import { useStudentFinanceWorkspace } from '../hooks/use-student-finance-workspace';
import type { AgreementScheduleItem, FinancialAgreementLine } from '../types';
import { formatPeriodRange } from '../utils/format-period';
import { agreementLineCategoryDetails } from '../utils/service-category-details';
import { hasAgreementData, resolveReferenceLabel } from '../utils/reference-labels';

function resolveInitialYearId(
  details: StudentDetailsData,
  years: { id: number }[],
  workspaceYearId?: number,
): string {
  if (workspaceYearId) return String(workspaceYearId);
  const enrollYear = details.current_enrollment?.academic_year;
  if (enrollYear && typeof enrollYear === 'object') return String(enrollYear.id);
  return years[0] ? String(years[0].id) : '';
}

export function StudentFinancialAgreementTab({
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
  const toast = useToast();
  const { formatDate } = useFormat();
  const refState = useFinanceReferenceData();
  const academicYears = refState.academicYears;
  const [academicYearId, setAcademicYearId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showCancelFuture, setShowCancelFuture] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    action: 'submit' | 'approve' | 'activate' | 'cancel';
    title: string;
    body: string;
  } | null>(null);

  const workspaceQuery = useMemo(
    () => (academicYearId ? { academic_year_id: Number(academicYearId) } : undefined),
    [academicYearId],
  );
  const workspaceState = useStudentFinanceWorkspace(studentId, workspaceQuery, !!academicYearId);
  const workspace = workspaceState.data;
  const agreementId = workspace?.current_agreement?.id ?? null;
  const agreementState = useFinancialAgreement(agreementId, !!agreementId);
  const agreement = agreementState.data ?? workspace?.current_agreement ?? null;

  useEffect(() => {
    if (academicYearId || !academicYears.length) return;
    const initial = resolveInitialYearId(details, academicYears, workspace?.academic_year?.id);
    if (initial) setAcademicYearId(initial);
  }, [academicYearId, academicYears, details, workspace?.academic_year?.id]);

  const currency = agreement?.currency ?? workspace?.summary?.currency;
  const allowed = agreement?.allowed_actions ?? workspace?.allowed_actions ?? {};
  const canCreate = allowed.create_agreement === true;

  const refreshAll = useCallback(() => {
    workspaceState.reload();
    agreementState.reload();
    onChanged();
  }, [workspaceState, agreementState, onChanged]);

  const runAction = useCallback(
    async (action: 'submit' | 'approve' | 'activate' | 'cancel') => {
      if (!agreement?.id) return;
      setActionLoading(action);
      const res = await postAgreementAction(agreement.id, action);
      setActionLoading(null);
      setPendingConfirm(null);
      if (!res.success) {
        toast.error(res.error.message);
        return;
      }
      toast.success(t(`admin.student360.financialAgreement.actions.${action}Success`));
      refreshAll();
    },
    [agreement?.id, t, toast, refreshAll],
  );

  function requestAction(action: 'submit' | 'approve' | 'activate' | 'cancel', confirmKey: string) {
    setPendingConfirm({
      action,
      title: t('common.confirm'),
      body: t(confirmKey),
    });
  }

  function requestActivate(activeAgreement: FinancialAgreement, partyLabel: string) {
    const msg = t('admin.student360.financialAgreement.confirmActivate', {
      net: String(activeAgreement.net_amount ?? '—'),
      count: String(activeAgreement.schedule_summary?.installment_count ?? '—'),
      party: partyLabel,
      year: refName(activeAgreement.academic_year) ?? '—',
    });
    setPendingConfirm({
      action: 'activate',
      title: t('admin.student360.financialAgreement.actions.activate'),
      body: msg,
    });
  }

  const lineColumns: Column<FinancialAgreementLine>[] = useMemo(
    () => [
      {
        key: 'service',
        header: t('admin.student360.financialAgreement.columns.service'),
        render: (row) => (
          <div className="student-finance-service-cell">
            <span>{refName(row.service) ?? t('common.dash')}</span>
            <ServiceCategoryDetailsList items={agreementLineCategoryDetails(row)} />
          </div>
        ),
      },
      {
        key: 'category',
        header: t('admin.student360.financialAgreement.columns.category'),
        render: (row) =>
          resolveReferenceLabel(
            t,
            'service_category',
            row.service?.category ?? '',
            refState.data?.service_categories,
          ),
      },
      {
        key: 'commitment',
        header: t('admin.student360.financialAgreement.columns.commitment'),
        render: (row) =>
          resolveReferenceLabel(t, 'commitment_type', row.commitment_type ?? '', refState.data?.commitment_types),
      },
      {
        key: 'pricing_unit',
        header: t('admin.student360.financialAgreement.columns.pricingUnit'),
        render: (row) =>
          resolveReferenceLabel(t, 'pricing_unit', row.pricing_unit ?? '', refState.data?.pricing_units),
      },
      {
        key: 'period',
        header: t('admin.student360.financialAgreement.columns.period'),
        render: (row) => formatPeriodRange(formatDate, row.period_start, row.period_end),
      },
      {
        key: 'quantity',
        header: t('admin.student360.financialAgreement.columns.quantity'),
        render: (row) => row.quantity ?? t('common.dash'),
      },
      {
        key: 'unit_price',
        header: t('admin.student360.financialAgreement.columns.unitPrice'),
        render: (row) => <FinanceMoney amount={row.unit_price} currency={currency?.name} />,
      },
      {
        key: 'gross',
        header: t('admin.student360.financialAgreement.columns.gross'),
        render: (row) => <FinanceMoney amount={row.gross_amount} currency={currency?.name} />,
      },
      {
        key: 'discount',
        header: t('admin.student360.financialAgreement.columns.discount'),
        render: (row) => <FinanceMoney amount={row.discount_amount} currency={currency?.name} />,
      },
      {
        key: 'net',
        header: t('admin.student360.financialAgreement.columns.net'),
        render: (row) => <FinanceMoney amount={row.net_amount} currency={currency?.name} />,
      },
    ],
    [t, formatDate, currency?.name, refState.data],
  );

  const scheduleColumns: Column<AgreementScheduleItem>[] = useMemo(
    () => [
      {
        key: 'period',
        header: t('admin.student360.financialAgreement.scheduleColumns.period'),
        render: (row) => formatPeriodRange(formatDate, row.period_start, row.period_end),
      },
      {
        key: 'display_from',
        header: t('admin.student360.financialAgreement.scheduleColumns.displayFrom'),
        render: (row) => formatDate(row.display_from),
      },
      {
        key: 'due_date',
        header: t('admin.student360.financialAgreement.scheduleColumns.dueDate'),
        render: (row) => formatDate(row.due_date),
      },
      {
        key: 'amount',
        header: t('admin.student360.financialAgreement.scheduleColumns.amount'),
        render: (row) => <FinanceMoney amount={row.amount} currency={currency?.name} />,
      },
      {
        key: 'state',
        header: t('admin.student360.financialAgreement.scheduleColumns.state'),
        render: (row) => <ScheduleItemStateBadge state={row.state ?? 'planned'} />,
      },
    ],
    [t, formatDate, currency?.name],
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

  if (workspaceState.error) {
    return <ApiErrorView error={workspaceState.error} onRetry={workspaceState.reload} />;
  }

  const headerActions = (
    <div className="student-finance-header-actions">
      <label className="student-finance-year-select">
        <span className="tiny muted">{t('admin.student360.finance.academicYear')}</span>
        <select
          className="input"
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          disabled={refState.loading || !academicYears.length}
        >
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </label>
      <div className="student-finance-header-buttons">
        {canCreate && !hasAgreementData(agreement) ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowCreate(true)}>
            {t('admin.student360.financialAgreement.create')}
          </button>
        ) : null}
        {agreement && allowed.edit ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setShowCreate(true)}
            disabled={!!actionLoading}
          >
            {t('admin.student360.financialAgreement.edit')}
          </button>
        ) : null}
      </div>
    </div>
  );

  if (!hasAgreementData(agreement)) {
    return (
      <div className="student-finance-tab student-360-tab-panel">
        <Student360SectionHeader
          title={t('admin.student360.financialAgreement.pageTitle')}
          description={t('admin.student360.financialAgreement.pageDescription')}
          action={headerActions}
        />
        <Student360CompactEmpty
          title={t('admin.student360.financialAgreement.emptyTitle')}
          description={t('admin.student360.financialAgreement.emptyDescription')}
          action={
            canCreate ? (
              <button type="button" className="btn btn--primary" onClick={() => setShowCreate(true)}>
                {t('admin.student360.financialAgreement.create')}
              </button>
            ) : undefined
          }
        />
        {showCreate ? (
          <AgreementCreateDrawer
            studentId={studentId}
            details={details}
            workspace={workspace ?? null}
            academicYearId={Number(academicYearId)}
            agreement={null}
            onClose={() => setShowCreate(false)}
            onSuccess={() => {
              setShowCreate(false);
              refreshAll();
            }}
          />
        ) : null}
      </div>
    );
  }

  const activeAgreement = agreement as FinancialAgreement;
  const billingProfile = activeAgreement.billing_profile;
  const billingPartner = activeAgreement.billing_partner ?? workspace?.billing_partner;
  const guardianRel = billingProfile?.guardian_id
    ? details.guardian_relationships.find((r) => r.guardian.id === billingProfile.guardian_id)
    : null;

  const summaryCards = [
    {
      key: 'gross',
      label: t('admin.student360.financialAgreement.summary.gross'),
      value: activeAgreement.gross_amount,
    },
    {
      key: 'discount',
      label: t('admin.student360.financialAgreement.summary.discounts'),
      value: activeAgreement.discount_amount,
    },
    {
      key: 'net',
      label: t('admin.student360.financialAgreement.summary.net'),
      value: activeAgreement.net_amount,
    },
    {
      key: 'installments',
      label: t('admin.student360.financialAgreement.summary.installmentCount'),
      value: activeAgreement.schedule_summary?.installment_count,
      isCount: true,
    },
  ];

  const policies = activeAgreement.schedule_policies;

  return (
    <div className="student-finance-tab student-360-tab-panel">
      <Student360SectionHeader
        title={t('admin.student360.financialAgreement.pageTitle')}
        description={t('admin.student360.financialAgreement.pageDescription')}
        action={headerActions}
      />

      <Card className="student-finance-agreement-header card">
        <dl className="detail-list student-finance-agreement-meta">
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.academicYear')}</dt>
            <dd>{refName(activeAgreement.academic_year) ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.number')}</dt>
            <dd>{activeAgreement.number ?? activeAgreement.name ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.state')}</dt>
            <dd>
              <AgreementStateBadge state={activeAgreement.state} />
            </dd>
          </div>
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.agreementDate')}</dt>
            <dd>{formatDate(activeAgreement.agreement_date)}</dd>
          </div>
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.validity')}</dt>
            <dd>{formatPeriodRange(formatDate, activeAgreement.valid_from, activeAgreement.valid_until)}</dd>
          </div>
        </dl>
      </Card>

      <Student360MetricGrid
        items={summaryCards.map((item) => ({
          key: item.key,
          label: item.label,
          value: item.isCount ? (
            <span className="mono">{item.value ?? '—'}</span>
          ) : (
            <FinanceMoney amount={item.value as number | undefined} currency={currency?.name} />
          ),
        }))}
      />

      <Card className="student-finance-section">
        <Student360SectionHeader title={t('admin.student360.financialAgreement.billingPartyTitle')} />
        <dl className="detail-list">
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.billingParty')}</dt>
            <dd>{refName(billingPartner) ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.partyType')}</dt>
            <dd>
              {resolveReferenceLabel(
                t,
                'billing_party_type',
                billingProfile?.billing_party_type ?? '',
                undefined,
              )}
            </dd>
          </div>
          {guardianRel ? (
            <div>
              <dt>{t('admin.student360.financialAgreement.fields.relationship')}</dt>
              <dd>{relationshipTypeLabel(t, guardianRel.relationship_type)}</dd>
            </div>
          ) : null}
          {guardianRel?.guardian?.phone || guardianRel?.guardian?.email ? (
            <div>
              <dt>{t('admin.student360.financialAgreement.fields.contact')}</dt>
              <dd>
                {[guardianRel.guardian?.phone, guardianRel.guardian?.email].filter(Boolean).join(' · ')}
              </dd>
            </div>
          ) : null}
        </dl>
        {!billingPartner && onOpenGuardians ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenGuardians}>
            {t('admin.student360.financialAgreement.openGuardians')}
          </button>
        ) : null}
      </Card>

      <Card className="student-finance-section">
        <Student360SectionHeader title={t('admin.student360.financialAgreement.linesTitle')} />
        {(activeAgreement.lines?.length ?? 0) === 0 ? (
          <p className="tiny muted">{t('admin.student360.financialAgreement.noLines')}</p>
        ) : (
          <div className="student-finance-table-wrap">
            <DataTable
              columns={lineColumns}
              rows={activeAgreement.lines ?? []}
              rowKey={(row) => row.id ?? `${row.service_id}-${row.tariff_id ?? 0}`}
            />
          </div>
        )}
      </Card>

      <Card className="student-finance-section">
        <Student360SectionHeader title={t('admin.student360.financialAgreement.scheduleTitle')} />
        {(activeAgreement.installments?.length ?? 0) === 0 ? (
          <p className="tiny muted">{t('admin.student360.financialAgreement.noSchedule')}</p>
        ) : (
          <div className="student-finance-table-wrap">
            <DataTable
              columns={scheduleColumns}
              rows={activeAgreement.installments ?? []}
              rowKey={(row) => row.id ?? `${row.period_start ?? 'p'}-${row.due_date ?? 'd'}`}
            />
          </div>
        )}
        {policies ? (
          <div className="student-finance-schedule-policy tiny muted">
            <p>{t('admin.student360.financialAgreement.schedulePolicyTitle')}</p>
            <ul>
              <li>
                {t('admin.student360.financialAgreement.schedulePolicy.generation')}:{' '}
                {resolveReferenceLabel(
                  t,
                  'schedule_generation_mode',
                  policies.generation_mode ?? '',
                  refState.data?.schedule_generation_modes,
                )}
              </li>
              <li>
                {t('admin.student360.financialAgreement.schedulePolicy.display')}:{' '}
                {resolveReferenceLabel(t, 'display_rule', policies.display_rule ?? '', refState.data?.display_rules)}
              </li>
              <li>
                {t('admin.student360.financialAgreement.schedulePolicy.dueDay')}:{' '}
                {policies.due_day_of_month ?? policies.due_offset_days ?? '—'}
              </li>
              <li>
                {t('admin.student360.financialAgreement.schedulePolicy.earlyPayment')}:{' '}
                {policies.allow_early_payment ? t('common.yes') : t('common.no')}
              </li>
              <li>
                {t('admin.student360.financialAgreement.schedulePolicy.firstPeriod')}:{' '}
                {resolveReferenceLabel(
                  t,
                  'first_period_policy',
                  policies.first_period_policy ?? '',
                  refState.data?.first_period_policies,
                )}
              </li>
            </ul>
          </div>
        ) : null}
      </Card>

      <div className="student-finance-agreement-actions row">
        {allowed.submit ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={actionLoading === 'submit'}
            onClick={() => requestAction('submit', 'admin.student360.financialAgreement.confirmSubmit')}
          >
            {t('admin.student360.financialAgreement.actions.submit')}
          </button>
        ) : null}
        {allowed.approve ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={actionLoading === 'approve'}
            onClick={() => requestAction('approve', 'admin.student360.financialAgreement.confirmApprove')}
          >
            {t('admin.student360.financialAgreement.actions.approve')}
          </button>
        ) : null}
        {allowed.activate ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={actionLoading === 'activate'}
            onClick={() =>
              requestActivate(activeAgreement, refName(billingPartner) ?? '—')
            }
          >
            {t('admin.student360.financialAgreement.actions.activate')}
          </button>
        ) : null}
        {allowed.cancel ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={actionLoading === 'cancel'}
            onClick={() => requestAction('cancel', 'admin.student360.financialAgreement.confirmCancel')}
          >
            {t('admin.student360.financialAgreement.actions.cancel')}
          </button>
        ) : null}
        {allowed.cancel_future_installments ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setShowCancelFuture(true)}
          >
            {t('admin.student360.financialAgreement.actions.cancelFuture')}
          </button>
        ) : null}
      </div>

      {showCancelFuture ? (
        <CancelFutureInstallmentsDrawer
          open={showCancelFuture}
          agreementId={activeAgreement.id}
          onClose={() => setShowCancelFuture(false)}
          onSuccess={refreshAll}
        />
      ) : null}

      {showCreate ? (
        <AgreementCreateDrawer
          studentId={studentId}
          details={details}
          workspace={workspace}
          academicYearId={Number(academicYearId)}
          agreement={activeAgreement}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            refreshAll();
          }}
        />
      ) : null}

      <ConfirmationDialog
        open={pendingConfirm != null}
        title={pendingConfirm?.title ?? t('common.confirm')}
        body={pendingConfirm?.body ?? ''}
        loading={actionLoading != null}
        onConfirm={() => {
          if (pendingConfirm) void runAction(pendingConfirm.action);
        }}
        onClose={() => setPendingConfirm(null)}
      />
    </div>
  );
}
