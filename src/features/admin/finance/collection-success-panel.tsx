'use client';

import Link from 'next/link';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import { paymentMethodLabel } from '@/lib/utils/finance';
import type { CollectionUpdatedOverview } from '@/types/student-financial-overview';
import type { CollectionSuccessSummary } from './resolve-collection-success-summary';

export function CollectionSuccessPanel({
  summary,
  updatedOverview,
  pageMode,
  onViewCollection,
  onClose,
}: {
  summary: CollectionSuccessSummary;
  updatedOverview?: CollectionUpdatedOverview | null;
  pageMode: boolean;
  onViewCollection: () => void;
  onClose: () => void;
}) {
  const t = useT();

  return (
    <div className="finance-collection-success">
      <div className="finance-collection-success__hero" role="status">
        <h3>{t('admin.finance.collectionWorkflow.paymentSuccessTitle')}</h3>
        <p className="muted">{t('admin.finance.collectionWorkflow.paymentSuccessBody')}</p>
        {summary.receiptNumber ? (
          <div className="finance-collection-success__receipt">
            <span className="finance-collection-success__receipt-label">
              {t('admin.finance.receiptNumber')}
            </span>
            <strong className="finance-collection-success__receipt-value mono" dir="ltr">
              {summary.receiptNumber}
            </strong>
          </div>
        ) : null}
      </div>

      {summary.fields.length ? (
        <dl className="detail-list finance-collection-success__facts">
          {summary.fields.map((field) => (
            <div key={field.key}>
              <dt>{t(field.labelKey)}</dt>
              <dd dir={field.key === 'journal' || field.key === 'reference' ? 'auto' : undefined}>
                {field.moneyAmount != null ? (
                  <FinanceMoney amount={field.moneyAmount} currency={field.currency ?? undefined} />
                ) : field.key === 'paymentMethod' ? (
                  paymentMethodLabel(field.value, t)
                ) : (
                  field.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {updatedOverview?.totals ? (
        <dl className="detail-list compact finance-collection-success__overview">
          {updatedOverview.totals.remaining != null ? (
            <div>
              <dt>{t('admin.student360.financeWorkspace.metrics.remaining')}</dt>
              <dd>
                <FinanceMoney amount={updatedOverview.totals.remaining} />
              </dd>
            </div>
          ) : null}
          {updatedOverview.totals.overdue != null ? (
            <div>
              <dt>{t('admin.student360.financeWorkspace.metrics.overdue')}</dt>
              <dd>
                <FinanceMoney amount={updatedOverview.totals.overdue} />
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="row form-actions finance-collection-success__actions">
        {summary.receiptId ? (
          <Link
            href={`/admin/finance/receipts/${summary.receiptId}`}
            className="btn btn--primary btn--sm"
          >
            {t('admin.finance.collections.openReceipt')}
          </Link>
        ) : null}
        {pageMode && summary.collectionId ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={onViewCollection}>
            {t('admin.finance.collectionWorkflow.viewCollection')}
          </button>
        ) : null}
        {!pageMode && summary.collectionId ? (
          <Link
            href={`/admin/finance/collections/${summary.collectionId}`}
            className="btn btn--ghost btn--sm"
          >
            {t('admin.finance.collectionWorkflow.viewCollectionDetails')}
          </Link>
        ) : null}
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
          {pageMode ? t('admin.finance.backToCollections') : t('common.close')}
        </button>
      </div>
    </div>
  );
}
