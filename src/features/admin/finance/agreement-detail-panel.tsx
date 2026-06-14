'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ApiErrorView, LoadingState, PermissionDeniedState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { Card } from '@/components/ui/primitives';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { AgreementStateBadge } from '@/features/admin/student-finance/components/agreement-state-badge';
import { ScheduleItemStateBadge } from '@/features/admin/student-finance/components/cheque-dual-badges';
import { ServiceCategoryDetailsList } from '@/features/admin/student-finance/components/service-category-details-list';
import { postAgreementAction } from '@/features/admin/student-finance/api/finance-admin-api';
import { useFinancialAgreement } from '@/features/admin/student-finance/hooks/use-financial-agreement';
import type { AgreementScheduleItem, FinancialAgreement, FinancialAgreementLine } from '@/features/admin/student-finance/types';
import { formatPeriodRange } from '@/features/admin/student-finance/utils/format-period';
import { agreementLineCategoryDetails } from '@/features/admin/student-finance/utils/service-category-details';
import { resolveReferenceLabel } from '@/features/admin/student-finance/utils/reference-labels';
import { Student360MetricGrid } from '@/features/admin/students/components/student-360-metric-grid';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { refName } from '@/lib/utils/finance';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';

export function AgreementDetailPanel({
  agreementId,
  returnTo,
}: {
  agreementId: number;
  returnTo?: string | null;
}) {
  const t = useT();
  const toast = useToast();
  const { formatDate } = useFormat();
  const refState = useFinanceReferenceData();
  const state = useFinancialAgreement(agreementId);
  const agreement = state.data;
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    action: 'submit' | 'approve' | 'activate' | 'cancel';
    body: string;
  } | null>(null);

  const safeReturn = sanitizeReturnTo(returnTo, `/admin/finance/agreements/${agreementId}`);
  const currency = agreement?.currency?.name;
  const allowed = agreement?.allowed_actions ?? {};

  const refresh = useCallback(() => state.reload(), [state]);

  const runAction = useCallback(
    async (action: 'submit' | 'approve' | 'activate' | 'cancel') => {
      setActionLoading(action);
      const res = await postAgreementAction(agreementId, action);
      setActionLoading(null);
      setPendingConfirm(null);
      if (!res.success) {
        toast.error(res.error.message);
        return;
      }
      toast.success(t(`admin.student360.financialAgreement.actions.${action}Success`));
      refresh();
    },
    [agreementId, t, toast, refresh],
  );

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
        key: 'net',
        header: t('admin.student360.financialAgreement.columns.net'),
        render: (row) => <FinanceMoney amount={row.net_amount} currency={currency} />,
      },
    ],
    [t, currency, refState.data?.service_categories],
  );

  const scheduleColumns: Column<AgreementScheduleItem>[] = useMemo(
    () => [
      {
        key: 'period',
        header: t('admin.student360.financialAgreement.scheduleColumns.period'),
        render: (row) => formatPeriodRange(formatDate, row.period_start, row.period_end),
      },
      {
        key: 'due_date',
        header: t('admin.student360.financialAgreement.scheduleColumns.dueDate'),
        render: (row) => formatDate(row.due_date) || t('common.dash'),
      },
      {
        key: 'amount',
        header: t('admin.student360.financialAgreement.scheduleColumns.amount'),
        render: (row) => <FinanceMoney amount={row.amount} currency={currency} />,
      },
      {
        key: 'state',
        header: t('admin.student360.financialAgreement.scheduleColumns.state'),
        render: (row) => <ScheduleItemStateBadge state={row.state ?? 'planned'} />,
      },
    ],
    [t, formatDate, currency],
  );

  if (state.loading && !agreement) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (state.error?.code === 'forbidden') {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  if (state.error || !agreement) {
    return (
      <ApiErrorView
        error={state.error ?? { code: 'not_found', message: t('admin.finance.agreements.notFound') }}
        onRetry={refresh}
      />
    );
  }

  const summaryCards = [
    {
      key: 'gross',
      label: t('admin.student360.financialAgreement.summary.gross'),
      value: agreement.gross_amount,
    },
    {
      key: 'discount',
      label: t('admin.student360.financialAgreement.summary.discounts'),
      value: agreement.discount_amount,
    },
    {
      key: 'net',
      label: t('admin.student360.financialAgreement.summary.net'),
      value: agreement.net_amount,
    },
    {
      key: 'installments',
      label: t('admin.student360.financialAgreement.summary.installmentCount'),
      value: agreement.schedule_summary?.installment_count,
      isCount: true,
    },
  ];

  return (
    <div className="form-stack">
      <div className="finance-hub-detail-actions">
        <Link
          href={buildStudentFinanceLink(agreement.student_id, 'financial-agreement', safeReturn)}
          className="btn btn--primary btn--sm"
        >
          {t('admin.finance.agreements.openStudent360')}
        </Link>
        {allowed.submit ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={!!actionLoading}
            onClick={() =>
              setPendingConfirm({
                action: 'submit',
                body: t('admin.student360.financialAgreement.confirmSubmit'),
              })
            }
          >
            {t('admin.student360.financialAgreement.actions.submit')}
          </button>
        ) : null}
        {allowed.approve ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={!!actionLoading}
            onClick={() =>
              setPendingConfirm({
                action: 'approve',
                body: t('admin.student360.financialAgreement.confirmApprove'),
              })
            }
          >
            {t('admin.student360.financialAgreement.actions.approve')}
          </button>
        ) : null}
        {allowed.activate ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={!!actionLoading}
            onClick={() =>
              setPendingConfirm({
                action: 'activate',
                body: t('admin.student360.financialAgreement.confirmActivateShort'),
              })
            }
          >
            {t('admin.student360.financialAgreement.actions.activate')}
          </button>
        ) : null}
        {allowed.cancel ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={!!actionLoading}
            onClick={() =>
              setPendingConfirm({
                action: 'cancel',
                body: t('admin.student360.financialAgreement.confirmCancel'),
              })
            }
          >
            {t('admin.student360.financialAgreement.actions.cancel')}
          </button>
        ) : null}
      </div>

      <Card className="student-finance-agreement-header card">
        <dl className="detail-list student-finance-agreement-meta">
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.number')}</dt>
            <dd className="mono">{agreement.number ?? agreement.name ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.state')}</dt>
            <dd>
              <AgreementStateBadge state={agreement.state} />
            </dd>
          </div>
          <div>
            <dt>{t('nav.students')}</dt>
            <dd>{refName(agreement.student) ?? `#${agreement.student_id}`}</dd>
          </div>
          <div>
            <dt>{t('nav.school')}</dt>
            <dd>{refName(agreement.school) ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.academicYear')}</dt>
            <dd>{refName(agreement.academic_year) ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.finance.agreements.columns.billingParty')}</dt>
            <dd>{refName(agreement.billing_partner) ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.agreementDate')}</dt>
            <dd>{formatDate(agreement.agreement_date) || t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.validity')}</dt>
            <dd>{formatPeriodRange(formatDate, agreement.valid_from, agreement.valid_until)}</dd>
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
            <FinanceMoney amount={item.value as number | undefined} currency={currency} />
          ),
        }))}
      />

      {(agreement.lines?.length ?? 0) > 0 ? (
        <Card className="student-finance-section">
          <Student360SectionHeader title={t('admin.student360.financialAgreement.linesTitle')} />
          <DataTable
            columns={lineColumns}
            rows={agreement.lines ?? []}
            rowKey={(row) => row.id ?? `${row.service_id ?? 'line'}-${row.net_amount ?? 0}`}
          />
        </Card>
      ) : null}

      {(agreement.installments?.length ?? 0) > 0 ? (
        <Card className="student-finance-section">
          <Student360SectionHeader title={t('admin.student360.financialAgreement.scheduleTitle')} />
          <DataTable
            columns={scheduleColumns}
            rows={agreement.installments ?? []}
            rowKey={(row) => row.id ?? `${row.sequence ?? 'sched'}-${row.due_date ?? ''}`}
          />
        </Card>
      ) : null}

      <ConfirmationDialog
        open={!!pendingConfirm}
        title={t('common.confirm')}
        body={pendingConfirm?.body ?? ''}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onClose={() => setPendingConfirm(null)}
        onConfirm={() => {
          if (pendingConfirm) void runAction(pendingConfirm.action);
        }}
        loading={!!actionLoading}
      />
    </div>
  );
}
