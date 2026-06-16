'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FeeTypeArchiveDialog, FeeTypeRestoreDialog } from '@/features/admin/finance/fee-types/fee-type-action-dialogs';
import { FeeTypeDeleteDialog } from '@/features/admin/finance/fee-types/fee-type-delete-dialog';
import { FeeTypeEditDrawer } from '@/features/admin/finance/fee-types/fee-type-edit-drawer';
import { feeTypeCategoryLabel, feeTypeFrequencyLabel } from '@/features/admin/finance/fee-types/fee-type-labels';
import {
  feeTypeAllowsAction,
  feeTypeUsageIsEmpty,
} from '@/features/admin/finance/fee-types/normalize-fee-type';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type { FeeTypeDetail } from '@/types/finance';

export function FeeTypeDetailView({
  feeType,
  returnTo,
  currencies,
  onReload,
  onDeleted,
}: {
  feeType: FeeTypeDetail;
  returnTo: string;
  currencies: Array<{ id: number; name: string }>;
  onReload: () => void;
  onDeleted: () => void;
}) {
  const t = useT();
  const { formatDateTime } = useFormat();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const usage = feeType.usage;
  const usageEmpty = feeTypeUsageIsEmpty(usage);
  const isUsed = usage?.historical_usage || feeType.usage_summary?.is_used;

  const headerActions = useMemo(() => {
    const actions: React.ReactNode[] = [];
    if (feeTypeAllowsAction(feeType, 'edit')) {
      actions.push(
        <button key="edit" type="button" className="btn btn--ghost" onClick={() => setEditOpen(true)}>
          {t('common.edit')}
        </button>,
      );
    }
    if (feeTypeAllowsAction(feeType, 'archive')) {
      actions.push(
        <button key="archive" type="button" className="btn btn--ghost" onClick={() => setArchiveOpen(true)}>
          {t('admin.finance.feeTypesWorkspace.archive')}
        </button>,
      );
    }
    if (feeTypeAllowsAction(feeType, 'restore')) {
      actions.push(
        <button key="restore" type="button" className="btn btn--ghost" onClick={() => setRestoreOpen(true)}>
          {t('admin.finance.feeTypesWorkspace.restore')}
        </button>,
      );
    }
    if (feeTypeAllowsAction(feeType, 'delete')) {
      actions.push(
        <button key="delete" type="button" className="btn btn--sm" onClick={() => setDeleteOpen(true)}>
          {t('admin.finance.feeTypesWorkspace.delete')}
        </button>,
      );
    }
    if (actions.length === 0) return undefined;
    return <div className="fee-type-detail-page__actions row">{actions}</div>;
  }, [feeType, t]);

  return (
    <>
      <Link href={returnTo} className="back-link fee-type-detail-page__back">
        ‹ {t('admin.finance.feeTypesWorkspace.backToFeeTypes')}
      </Link>

      <PageHeader title={feeType.name} subtitle={feeType.code} actions={headerActions} />

      <div className="fee-type-detail-page__badges row">
        <Badge tone={feeType.active ? 'green' : 'slate'}>
          {feeType.active ? t('states.active') : t('states.archived')}
        </Badge>
        {isUsed ? (
          <Badge tone="amber">{t('admin.finance.feeTypesWorkspace.usageStatusUsed')}</Badge>
        ) : (
          <Badge tone="slate">{t('admin.finance.feeTypesWorkspace.usageStatusUnused')}</Badge>
        )}
      </div>

      <section className="card fee-type-detail-summary">
        <dl className="fee-type-detail-summary__grid">
          <div>
            <dt>{t('admin.finance.feeTypeName')}</dt>
            <dd dir="auto">{feeType.name}</dd>
          </div>
          <div>
            <dt>{t('admin.finance.feeTypeCode')}</dt>
            <dd className="mono" dir="ltr">
              {feeType.code}
            </dd>
          </div>
          <div>
            <dt>{t('admin.finance.category')}</dt>
            <dd>{feeTypeCategoryLabel(feeType.category, t)}</dd>
          </div>
          <div>
            <dt>{t('admin.finance.feeTypesWorkspace.frequency')}</dt>
            <dd>{feeTypeFrequencyLabel(feeType.frequency, t)}</dd>
          </div>
          <div>
            <dt>{t('admin.finance.defaultAmount')}</dt>
            <dd>
              <FinanceMoney amount={feeType.default_amount} currency={feeType.currency} />
            </dd>
          </div>
          <div>
            <dt>{t('admin.finance.feeTypesWorkspace.currency')}</dt>
            <dd dir="ltr">
              {typeof feeType.currency === 'object' ? feeType.currency?.name : feeType.currency}
            </dd>
          </div>
          <div>
            <dt>{t('admin.finance.feeTypesWorkspace.isMandatory')}</dt>
            <dd>
              {feeType.is_mandatory
                ? t('admin.finance.feeTypesWorkspace.yes')
                : t('admin.finance.feeTypesWorkspace.no')}
            </dd>
          </div>
          <div>
            <dt>{t('admin.finance.feeTypesWorkspace.requiresSubscription')}</dt>
            <dd>
              {feeType.requires_subscription
                ? t('admin.finance.feeTypesWorkspace.yes')
                : t('admin.finance.feeTypesWorkspace.no')}
            </dd>
          </div>
          <div>
            <dt>{t('admin.finance.feeTypesWorkspace.requiresUsageTracking')}</dt>
            <dd>
              {feeType.requires_usage_tracking
                ? t('admin.finance.feeTypesWorkspace.yes')
                : t('admin.finance.feeTypesWorkspace.no')}
            </dd>
          </div>
          <div>
            <dt>{t('admin.finance.feeTypesWorkspace.sequence')}</dt>
            <dd>{feeType.sequence ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.finance.activeSchool')}</dt>
            <dd dir="auto">{feeType.school?.name ?? t('common.dash')}</dd>
          </div>
          {feeType.description ? (
            <div className="fee-type-detail-summary__description">
              <dt>{t('common.description')}</dt>
              <dd dir="auto">{feeType.description}</dd>
            </div>
          ) : null}
          {feeType.create_date ? (
            <div>
              <dt>{t('admin.finance.feeTypesWorkspace.createDate')}</dt>
              <dd>{formatDateTime(feeType.create_date)}</dd>
            </div>
          ) : null}
          {feeType.write_date ? (
            <div>
              <dt>{t('admin.finance.feeTypesWorkspace.writeDate')}</dt>
              <dd>{formatDateTime(feeType.write_date)}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="card fee-type-detail-usage">
        <h2>{t('admin.finance.feeTypesWorkspace.usageSection')}</h2>
        {usageEmpty && !usage?.historical_usage ? (
          <p className="muted">{t('admin.finance.feeTypesWorkspace.usageEmpty')}</p>
        ) : (
          <>
            {isUsed ? (
              <p className="fee-type-detail-usage__hint muted">
                {t('admin.finance.feeTypesWorkspace.usageUsedHint')}
              </p>
            ) : null}
            <dl className="fee-type-detail-usage__grid">
              <div>
                <dt>{t('admin.finance.feeTypesWorkspace.usageFeePlans')}</dt>
                <dd>{usage?.fee_plan_count ?? 0}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.feeTypesWorkspace.usageConfirmedFeePlans')}</dt>
                <dd>{usage?.confirmed_fee_plan_count ?? 0}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.feeTypesWorkspace.usageAgreements')}</dt>
                <dd>{usage?.agreement_count ?? 0}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.feeTypesWorkspace.usageStudentFees')}</dt>
                <dd>{usage?.student_fee_count ?? 0}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.feeTypesWorkspace.usageInstallments')}</dt>
                <dd>{usage?.installment_count ?? 0}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.feeTypesWorkspace.usageCollections')}</dt>
                <dd>{usage?.collection_count ?? 0}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.feeTypesWorkspace.usageReceipts')}</dt>
                <dd>{usage?.receipt_count ?? 0}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.feeTypesWorkspace.usageHistorical')}</dt>
                <dd>
                  {usage?.historical_usage
                    ? t('admin.finance.feeTypesWorkspace.yes')
                    : t('admin.finance.feeTypesWorkspace.no')}
                </dd>
              </div>
              <div>
                <dt>{t('admin.finance.feeTypesWorkspace.usageCanDelete')}</dt>
                <dd>
                  {usage?.can_delete
                    ? t('admin.finance.feeTypesWorkspace.yes')
                    : t('admin.finance.feeTypesWorkspace.no')}
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>

      <FeeTypeEditDrawer
        open={editOpen}
        feeType={feeType}
        currencies={currencies}
        onClose={() => setEditOpen(false)}
        onSaved={onReload}
      />
      <FeeTypeArchiveDialog
        open={archiveOpen}
        feeType={feeType}
        onClose={() => setArchiveOpen(false)}
        onSuccess={onReload}
      />
      <FeeTypeRestoreDialog
        open={restoreOpen}
        feeType={feeType}
        onClose={() => setRestoreOpen(false)}
        onSuccess={onReload}
      />
      <FeeTypeDeleteDialog
        open={deleteOpen}
        feeType={feeType}
        onClose={() => setDeleteOpen(false)}
        onDeleted={onDeleted}
        onArchiveInstead={
          feeTypeAllowsAction(feeType, 'archive') ? () => setArchiveOpen(true) : undefined
        }
      />
    </>
  );
}
