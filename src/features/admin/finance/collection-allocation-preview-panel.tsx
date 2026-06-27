'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { CollectionCreditBalanceCard } from '@/features/admin/finance/collection-credit-balance-card';
import { normalizeInstallmentDisplayLabel } from '@/features/admin/finance/collection-labels';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type { PaymentCollectionPreview } from '@/types/payment-collection-preview';
import type { CollectibleItem } from '@/types/student-financial-overview';

function resolveInstallmentLabel(
  installmentId: number,
  items: CollectibleItem[],
  locale: string,
  fallback?: string | null,
): string {
  const row = items.find((item) => item.installment_id === installmentId || item.id === installmentId);
  if (row) {
    const label =
      row.display_label?.trim() ||
      row.period_label?.trim() ||
      row.fee_name?.trim() ||
      row.fee_type_name?.trim();
    if (label) return normalizeInstallmentDisplayLabel(label, locale);
  }
  return fallback?.trim() || `#${installmentId}`;
}

function statusLabelKey(status: string): string {
  if (status === 'paid') return 'admin.finance.collectionWorkflow.allocationStatusPaid';
  if (status === 'partial') return 'admin.finance.collectionWorkflow.allocationStatusPartial';
  return 'admin.finance.collectionWorkflow.allocationStatusPartial';
}

export function CollectionAllocationPreviewPanel({
  preview,
  items,
  currency,
  loading,
}: {
  preview: PaymentCollectionPreview | null;
  items: CollectibleItem[];
  currency?: string | null;
  loading?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();

  if (loading) {
    return (
      <div className="collection-allocation-preview collection-allocation-preview--loading">
        <p className="muted">{t('admin.finance.collectionWorkflow.previewLoading')}</p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="collection-allocation-preview collection-allocation-preview--empty">
        <p className="muted">{t('admin.finance.collectionWorkflow.previewEmptyHint')}</p>
      </div>
    );
  }

  return (
    <section className="collection-allocation-preview" aria-live="polite">
      <header className="collection-allocation-preview__head">
        <h4>{t('admin.finance.collectionWorkflow.previewResultTitle')}</h4>
        <p className="muted tiny">
          {t('admin.finance.collectionWorkflow.previewIntro', {
            amount: '',
          }).replace(/\s*$/, '')}{' '}
          <FinanceMoney amount={preview.amount} currency={currency} />
        </p>
      </header>

      <dl className="collection-allocation-preview__metrics detail-list compact">
        <div>
          <dt>{t('admin.finance.collectionWorkflow.previewRemainingAfter')}</dt>
          <dd>
            <FinanceMoney amount={preview.remaining_total} currency={currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.collectionWorkflow.previewInstallmentCount')}</dt>
          <dd>{preview.allocations.length}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.collectionWorkflow.allocatedAmount')}</dt>
          <dd>
            <FinanceMoney amount={preview.allocated_amount} currency={currency} />
          </dd>
        </div>
      </dl>

      <CollectionCreditBalanceCard preview={preview} currency={currency} />

      {preview.is_prepayment && preview.prepayment_allowed ? (
        <p className="collection-allocation-preview__warning" role="status">
          {t('admin.finance.collectionWorkflow.prepaymentSpreadWarning')}
        </p>
      ) : null}

      {preview.allocations.length ? (
        <ul className="collection-allocation-preview__list">
          {preview.allocations.map((row) => (
            <li key={`${row.installment_id}-${row.amount}`}>
              <span className="collection-allocation-preview__label" dir="auto">
                {resolveInstallmentLabel(
                  row.installment_id,
                  items,
                  locale,
                  row.display_label ?? row.period_label ?? row.fee_name,
                )}
              </span>
              <span className="collection-allocation-preview__amount">
                <FinanceMoney amount={row.amount} currency={currency} />
              </span>
              <span className={`collection-allocation-preview__status is-${row.status_after}`}>
                {t(statusLabelKey(row.status_after))}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
