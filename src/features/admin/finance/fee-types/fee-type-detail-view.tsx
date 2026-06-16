'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { FeeTypeArchiveDialog, FeeTypeRestoreDialog } from '@/features/admin/finance/fee-types/fee-type-action-dialogs';
import { FeeTypeDeleteDialog } from '@/features/admin/finance/fee-types/fee-type-delete-dialog';
import { FeeTypeEditDrawer } from '@/features/admin/finance/fee-types/fee-type-edit-drawer';
import { feeTypeCategoryLabel } from '@/features/admin/finance/fee-types/fee-type-labels';
import {
  feeTypeAllowsAction,
  feeTypeUsageIsEmpty,
} from '@/features/admin/finance/fee-types/normalize-fee-type';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type { FeeTypeDetail } from '@/types/finance';

function BoolValue({ value, t }: { value?: boolean; t: (key: string) => string }) {
  return (
    <span className={`fee-type-detail-bool${value ? ' fee-type-detail-bool--yes' : ''}`}>
      {value ? t('admin.finance.feeTypesWorkspace.yes') : t('admin.finance.feeTypesWorkspace.no')}
    </span>
  );
}

function UsageMetric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`fee-type-detail-usage__metric${highlight ? ' fee-type-detail-usage__metric--active' : ''}`}
    >
      <span className="fee-type-detail-usage__metric-value">{value}</span>
      <span className="fee-type-detail-usage__metric-label">{label}</span>
    </div>
  );
}

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
        <button key="edit" type="button" className="btn btn--primary btn--sm" onClick={() => setEditOpen(true)}>
          {t('common.edit')}
        </button>,
      );
    }
    if (feeTypeAllowsAction(feeType, 'archive')) {
      actions.push(
        <button key="archive" type="button" className="btn btn--ghost btn--sm" onClick={() => setArchiveOpen(true)}>
          {t('admin.finance.feeTypesWorkspace.archive')}
        </button>,
      );
    }
    if (feeTypeAllowsAction(feeType, 'restore')) {
      actions.push(
        <button key="restore" type="button" className="btn btn--ghost btn--sm" onClick={() => setRestoreOpen(true)}>
          {t('admin.finance.feeTypesWorkspace.restore')}
        </button>,
      );
    }
    if (feeTypeAllowsAction(feeType, 'delete')) {
      actions.push(
        <button key="delete" type="button" className="btn btn--sm fee-type-detail-hero__delete" onClick={() => setDeleteOpen(true)}>
          {t('admin.finance.feeTypesWorkspace.delete')}
        </button>,
      );
    }
    if (actions.length === 0) return null;
    return <div className="fee-type-detail-hero__actions">{actions}</div>;
  }, [feeType, t]);

  return (
    <>
      <Link href={returnTo} className="back-link fee-type-detail-page__back">
        ‹ {t('admin.finance.feeTypesWorkspace.backToFeeTypes')}
      </Link>

      <header className="card fee-type-detail-hero">
        <div className="fee-type-detail-hero__layout">
          <div className="fee-type-detail-hero__main">
            <h1 className="fee-type-detail-hero__title" dir="auto">
              {feeType.name}
            </h1>
            <p className="fee-type-detail-hero__code mono" dir="ltr">
              {feeType.code}
            </p>
            <div className="fee-type-detail-hero__badges">
              <Badge tone={feeType.active ? 'green' : 'slate'}>
                {feeType.active ? t('states.active') : t('states.archived')}
              </Badge>
              {isUsed ? (
                <Badge tone="amber">{t('admin.finance.feeTypesWorkspace.usageStatusUsed')}</Badge>
              ) : (
                <Badge tone="slate">{t('admin.finance.feeTypesWorkspace.usageStatusUnused')}</Badge>
              )}
            </div>
          </div>
          {headerActions}
        </div>
      </header>

      <section className="card fee-type-detail-summary">
        <dl className="fee-type-detail-summary__grid">
          <div>
            <dt>{t('admin.finance.category')}</dt>
            <dd>{feeTypeCategoryLabel(feeType.category, t)}</dd>
          </div>
          <div>
            <dt>{t('admin.finance.feeTypesWorkspace.requiresSubscription')}</dt>
            <dd>
              <BoolValue value={feeType.requires_subscription} t={t} />
            </dd>
          </div>
          <div>
            <dt>{t('admin.finance.feeTypesWorkspace.requiresUsageTracking')}</dt>
            <dd>
              <BoolValue value={feeType.requires_usage_tracking} t={t} />
            </dd>
          </div>
          <div>
            <dt>{t('admin.finance.feeTypesWorkspace.sequence')}</dt>
            <dd>{feeType.sequence ?? t('common.dash')}</dd>
          </div>
          <div className="fee-type-detail-summary__school">
            <dt>{t('admin.finance.activeSchool')}</dt>
            <dd dir="auto">{feeType.school?.name ?? t('common.dash')}</dd>
          </div>
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
          {feeType.description ? (
            <div className="fee-type-detail-summary__description">
              <dt>{t('common.description')}</dt>
              <dd dir="auto">{feeType.description}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="card fee-type-detail-usage">
        <div className="fee-type-detail-usage__head">
          <h2>{t('admin.finance.feeTypesWorkspace.usageSection')}</h2>
        </div>

        {usageEmpty && !usage?.historical_usage ? (
          <p className="fee-type-detail-usage__empty">{t('admin.finance.feeTypesWorkspace.usageEmpty')}</p>
        ) : (
          <>
            {isUsed ? (
              <div className="fee-type-detail-usage__callout" role="note">
                {t('admin.finance.feeTypesWorkspace.usageUsedHint')}
              </div>
            ) : null}

            <div className="fee-type-detail-usage__metrics">
              <UsageMetric
                label={t('admin.finance.feeTypesWorkspace.usageFeePlans')}
                value={usage?.fee_plan_count ?? 0}
                highlight={(usage?.fee_plan_count ?? 0) > 0}
              />
              <UsageMetric
                label={t('admin.finance.feeTypesWorkspace.usageConfirmedFeePlans')}
                value={usage?.confirmed_fee_plan_count ?? 0}
                highlight={(usage?.confirmed_fee_plan_count ?? 0) > 0}
              />
              <UsageMetric
                label={t('admin.finance.feeTypesWorkspace.usageAgreements')}
                value={usage?.agreement_count ?? 0}
                highlight={(usage?.agreement_count ?? 0) > 0}
              />
              <UsageMetric
                label={t('admin.finance.feeTypesWorkspace.usageStudentFees')}
                value={usage?.student_fee_count ?? 0}
                highlight={(usage?.student_fee_count ?? 0) > 0}
              />
              <UsageMetric
                label={t('admin.finance.feeTypesWorkspace.usageInstallments')}
                value={usage?.installment_count ?? 0}
                highlight={(usage?.installment_count ?? 0) > 0}
              />
              <UsageMetric
                label={t('admin.finance.feeTypesWorkspace.usageCollections')}
                value={usage?.collection_count ?? 0}
                highlight={(usage?.collection_count ?? 0) > 0}
              />
              <UsageMetric
                label={t('admin.finance.feeTypesWorkspace.usageReceipts')}
                value={usage?.receipt_count ?? 0}
                highlight={(usage?.receipt_count ?? 0) > 0}
              />
            </div>

            <dl className="fee-type-detail-usage__flags">
              <div>
                <dt>{t('admin.finance.feeTypesWorkspace.usageHistorical')}</dt>
                <dd>
                  <BoolValue value={usage?.historical_usage} t={t} />
                </dd>
              </div>
              <div>
                <dt>{t('admin.finance.feeTypesWorkspace.usageCanDelete')}</dt>
                <dd>
                  <BoolValue value={usage?.can_delete} t={t} />
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>

      <FeeTypeEditDrawer
        open={editOpen}
        feeType={feeType}
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
