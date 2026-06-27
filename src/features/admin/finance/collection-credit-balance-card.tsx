'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { resolveCollectionCreditSummary } from '@/features/admin/finance/collection-credit-summary';
import { useT } from '@/features/i18n/locale-context';
import type { PaymentCollectionPreview } from '@/types/payment-collection-preview';

/**
 * Payment + credit-balance summary card shown before saving a collection.
 *
 * Renders the Odoo-reported amounts only. The resulting credit balance is shown
 * separately from remaining/overdue/paid so it is never mistaken for a payment that
 * reduces dues. All values come from the preview; nothing is recomputed locally.
 */
export function CollectionCreditBalanceCard({
  preview,
  currency,
}: {
  preview: PaymentCollectionPreview | null;
  currency?: string | null;
}) {
  const t = useT();
  const summary = resolveCollectionCreditSummary(preview);
  if (!summary) return null;

  const noticeKey = summary.isFullCreditBalance
    ? 'admin.finance.collectionWorkflow.fullCreditBalanceNotice'
    : 'admin.finance.collectionWorkflow.unallocatedBecomesCreditNotice';

  return (
    <section className="collection-credit-summary" aria-live="polite">
      <h5 className="collection-credit-summary__title">
        {t('admin.finance.collectionWorkflow.creditBalanceSummaryTitle')}
      </h5>
      <dl className="detail-list compact collection-credit-summary__metrics">
        <div>
          <dt>{t('admin.finance.collectionWorkflow.amountPaid')}</dt>
          <dd>
            <FinanceMoney amount={summary.amountPaid} currency={currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.collectionWorkflow.allocatedToInstallments')}</dt>
          <dd>
            <FinanceMoney amount={summary.allocatedAmount} currency={currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.collectionWorkflow.unallocatedAmount')}</dt>
          <dd>
            <FinanceMoney amount={summary.unallocatedAmount} currency={currency} />
          </dd>
        </div>
      </dl>

      {summary.hasCreditBalance ? (
        <div className="collection-credit-summary__credit" role="group">
          <span className="collection-credit-summary__credit-label">
            {t('admin.finance.collectionWorkflow.resultingCreditBalance')}
          </span>
          <span className="collection-credit-summary__credit-amount">
            <FinanceMoney amount={summary.resultingCreditBalance} currency={currency} />
          </span>
        </div>
      ) : null}

      {summary.hasCreditBalance ? (
        <>
          <p className="collection-credit-summary__notice">{t(noticeKey)}</p>
          <p className="collection-credit-summary__warning" role="status">
            {t('admin.finance.collectionWorkflow.creditBalanceNotReducingDuesWarning')}
          </p>
        </>
      ) : null}

      {summary.warnings.length ? (
        <ul className="collection-credit-summary__warnings">
          {summary.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
