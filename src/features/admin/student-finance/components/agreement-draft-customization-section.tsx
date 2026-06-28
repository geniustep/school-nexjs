'use client';

import { useCallback, useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/tables/data-table';
import { Card } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { Student360CompactEmpty } from '@/features/admin/students/components/student-360-compact-empty';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import { ServiceCategoryDetailsList } from './service-category-details-list';
import {
  generateAgreementSchedule,
  previewAgreementSchedule,
} from '../api/finance-admin-api';
import type {
  AgreementScheduleItem,
  FinancialAgreement,
  FinancialAgreementLine,
} from '../types';
import { formatPeriodRange } from '../utils/format-period';
import {
  canGenerateAgreementSchedule,
  canMutateAgreementLines,
  canPreviewAgreementSchedule,
  isAgreementEditableBeforeActivation,
  resolveAgreementBillingModeLabelKey,
} from '../utils/resolve-agreement-draft-customization';
import { agreementLineCategoryDetails } from '../utils/service-category-details';
import { formatAgreementLineQuantityDisplay } from '../utils/agreement-line-quantity-edit';
import { resolveServiceDisplayName } from '../utils/reference-labels';
import { AgreementLineDeleteDrawer, AgreementLineFormDrawer } from './agreement-line-form-drawer';
import { ScheduleItemStateBadge } from './cheque-dual-badges';

export function AgreementDraftCustomizationSection({
  agreement,
  currency,
  onChanged,
}: {
  agreement: FinancialAgreement;
  currency?: string | null;
  onChanged: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const { formatDate } = useFormat();
  const allowed = agreement.allowed_actions ?? {};
  const isEditable = isAgreementEditableBeforeActivation(agreement.state, allowed);
  const isActive = agreement.state === 'active';
  const canMutateLines = canMutateAgreementLines(allowed);
  const canPreview = canPreviewAgreementSchedule(allowed);
  const canGenerate = canGenerateAgreementSchedule(allowed);

  const [lineFormMode, setLineFormMode] = useState<'add' | 'edit' | null>(null);
  const [editingLine, setEditingLine] = useState<FinancialAgreementLine | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinancialAgreementLine | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [linesModified, setLinesModified] = useState(false);
  const [previewRows, setPreviewRows] = useState<AgreementScheduleItem[]>([]);
  const [previewTotal, setPreviewTotal] = useState<number | null>(null);

  const lines = agreement.lines ?? [];

  const customizationColumns: Column<FinancialAgreementLine>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.student360.financialAgreement.customization.columns.lineName'),
        render: (row) => (
          <div className="student-finance-service-cell">
            <span dir="auto">
              {(row as FinancialAgreementLine & { service_name?: string }).service_name ??
                resolveServiceDisplayName(t, row.service) ??
                t('common.dash')}
            </span>
            <ServiceCategoryDetailsList items={agreementLineCategoryDetails(row)} />
          </div>
        ),
      },
      {
        key: 'billing_mode',
        header: t('admin.student360.financialAgreement.customization.columns.billingMode'),
        render: (row) => t(resolveAgreementBillingModeLabelKey(row.commitment_type)),
      },
      {
        key: 'unit_price',
        header: t('admin.student360.financialAgreement.customization.columns.originalPrice'),
        render: (row) => <FinanceMoney amount={row.unit_price} currency={currency ?? undefined} />,
      },
      {
        key: 'quantity',
        header: t('admin.student360.financialAgreement.customization.columns.quantity'),
        render: (row) => <span dir="auto">{formatAgreementLineQuantityDisplay(t, row)}</span>,
      },
      {
        key: 'discount',
        header: t('admin.student360.financialAgreement.customization.columns.discount'),
        render: (row) => <FinanceMoney amount={row.discount_amount} currency={currency ?? undefined} />,
      },
      {
        key: 'net',
        header: t('admin.student360.financialAgreement.customization.columns.net'),
        render: (row) => <FinanceMoney amount={row.net_amount} currency={currency ?? undefined} />,
      },
      {
        key: 'schedule_total',
        header: t('admin.student360.financialAgreement.customization.columns.expectedInstallments'),
        render: (row) => {
          const summary = (row as FinancialAgreementLine & { schedule_summary?: { total_amount?: number } })
            .schedule_summary;
          if (summary?.total_amount != null) {
            return <FinanceMoney amount={summary.total_amount} currency={currency ?? undefined} />;
          }
          return row.net_amount != null ? (
            <FinanceMoney amount={row.net_amount} currency={currency ?? undefined} />
          ) : (
            t('common.dash')
          );
        },
      },
      ...(canMutateLines
        ? [
            {
              key: 'actions',
              header: t('common.actions'),
              render: (row: FinancialAgreementLine) => (
                <div className="row student-finance-line-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={!!actionLoading}
                    onClick={() => {
                      setEditingLine(row);
                      setLineFormMode('edit');
                    }}
                  >
                    {t('admin.student360.financialAgreement.customization.editLine')}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={!!actionLoading}
                    onClick={() => setDeleteTarget(row)}
                  >
                    {t('admin.student360.financialAgreement.customization.deleteLine')}
                  </button>
                </div>
              ),
            } as Column<FinancialAgreementLine>,
          ]
        : []),
    ],
    [t, currency, canMutateLines, actionLoading],
  );

  const previewColumns: Column<AgreementScheduleItem>[] = useMemo(
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
        render: (row) => <FinanceMoney amount={row.amount} currency={currency ?? undefined} />,
      },
      {
        key: 'state',
        header: t('admin.student360.financialAgreement.scheduleColumns.state'),
        render: (row) => <ScheduleItemStateBadge state={row.state ?? 'planned'} />,
      },
    ],
    [t, formatDate, currency],
  );

  const handleLineChanged = useCallback(() => {
    setLinesModified(true);
    setPreviewRows([]);
    setPreviewTotal(null);
    onChanged();
  }, [onChanged]);

  const runPreview = useCallback(async () => {
    setActionLoading('preview');
    const policies = agreement.schedule_policies ?? {};
    const res = await previewAgreementSchedule(agreement.id, {
      generation_mode: policies.generation_mode,
      due_day_of_month: policies.due_day_of_month,
      allow_early_payment: policies.allow_early_payment,
      first_period_policy: policies.first_period_policy,
    });
    setActionLoading(null);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    setPreviewRows(res.data.periods ?? []);
    setPreviewTotal(res.data.total ?? null);
    toast.success(t('admin.student360.financialAgreement.customization.previewReady'));
  }, [agreement.id, agreement.schedule_policies, t, toast]);

  const runGenerate = useCallback(async () => {
    setActionLoading('generate');
    const res = await generateAgreementSchedule(agreement.id);
    setActionLoading(null);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    setLinesModified(false);
    setPreviewRows([]);
    toast.success(t('admin.student360.financialAgreement.customization.scheduleUpdated'));
    onChanged();
  }, [agreement.id, onChanged, t, toast]);

  if (isActive) {
    return (
      <div className="student-finance-agreement-callout" role="note">
        <span className="student-finance-agreement-callout__icon" aria-hidden="true">
          ✓
        </span>
        <p>{t('admin.student360.financialAgreement.customization.activeAgreementNotice')}</p>
      </div>
    );
  }

  if (!isEditable) return null;

  return (
    <>
      <Card className="student-finance-section student-finance-agreement-customization">
        <Student360SectionHeader
          title={t('admin.student360.financialAgreement.customization.sectionTitle')}
          action={
            canMutateLines ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  setEditingLine(null);
                  setLineFormMode('add');
                }}
              >
                {t('admin.student360.financialAgreement.customization.addLine')}
              </button>
            ) : null
          }
        />
        <p className="muted">{t('admin.student360.financialAgreement.customization.sectionDesc')}</p>

        {lines.length === 0 ? (
          <Student360CompactEmpty
            className="student-360-compact-empty--section"
            title={t('admin.student360.financialAgreement.noLines')}
            description={t('admin.student360.financialAgreement.customization.emptyLinesDesc')}
          />
        ) : (
          <div className="student-finance-table-wrap">
            <DataTable
              columns={customizationColumns}
              rows={lines}
              rowKey={(row) => row.id ?? `${row.service_id}-${row.tariff_id ?? 0}`}
            />
          </div>
        )}

        {linesModified ? (
          <div className="student-finance-section student-finance-card-alert" role="alert">
            <p>{t('admin.student360.financialAgreement.customization.scheduleRefreshRequired')}</p>
          </div>
        ) : null}

        {(canPreview || canGenerate) && (
          <div className="row student-finance-agreement-schedule-actions">
            {canPreview ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={actionLoading === 'preview'}
                onClick={() => void runPreview()}
              >
                {t('admin.student360.financialAgreement.customization.previewSchedule')}
              </button>
            ) : null}
            {canGenerate ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={actionLoading === 'generate'}
                onClick={() => void runGenerate()}
              >
                {t('admin.student360.financialAgreement.customization.regenerateSchedule')}
              </button>
            ) : null}
          </div>
        )}

        {previewRows.length > 0 ? (
          <div className="student-finance-agreement-schedule-preview">
            <Student360SectionHeader
              title={t('admin.student360.financialAgreement.customization.previewTitle')}
              description={
                previewTotal != null
                  ? t('admin.student360.financialAgreement.customization.previewTotal', {
                      total: String(previewTotal),
                    })
                  : undefined
              }
            />
            <div className="student-finance-table-wrap">
              <DataTable
                columns={previewColumns}
                rows={previewRows}
                rowKey={(row) => row.id ?? `${row.due_date ?? 'p'}-${row.period_start ?? 's'}`}
              />
            </div>
          </div>
        ) : null}
      </Card>

      {lineFormMode ? (
        <AgreementLineFormDrawer
          open
          mode={lineFormMode}
          agreementId={agreement.id}
          existingLines={lines}
          line={editingLine}
          agreementNetAmount={agreement.net_amount ?? agreement.net_total}
          academicYearId={agreement.academic_year_id}
          currency={currency}
          onClose={() => {
            setLineFormMode(null);
            setEditingLine(null);
          }}
          onSuccess={handleLineChanged}
        />
      ) : null}

      {deleteTarget ? (
        <AgreementLineDeleteDrawer
          open
          agreementId={agreement.id}
          existingLines={lines}
          line={deleteTarget}
          agreementNetAmount={agreement.net_amount ?? agreement.net_total}
          currency={currency}
          onClose={() => setDeleteTarget(null)}
          onSuccess={handleLineChanged}
        />
      ) : null}
    </>
  );
}