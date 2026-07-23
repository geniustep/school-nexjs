'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { formatInstallmentLabel } from '@/features/admin/finance/collection-labels';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { formatPeriodRange } from '@/features/admin/student-finance/utils/format-period';
import type { StudentInstallment } from '@/features/admin/student-finance/types';

export function CollectionAllocationSummary({
  installments,
  allocationInputs,
  collectionAmount,
  currency,
  manualMode,
  onEditManual,
}: {
  installments: StudentInstallment[];
  allocationInputs: Record<number, string>;
  collectionAmount: number;
  currency?: string | null;
  manualMode: boolean;
  onEditManual: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  const allocatedTotal = installments.reduce((sum, row) => {
    const v = Number(allocationInputs[row.id] ?? 0);
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);
  const unallocated = Math.max(0, collectionAmount - allocatedTotal);

  const lines = installments
    .map((row) => {
      const amount = Number(allocationInputs[row.id] ?? 0);
      if (!amount) return null;
      const { title } = formatInstallmentLabel(row, t, formatDate, formatPeriodRange, locale);
      return { id: row.id, title, amount };
    })
    .filter((line): line is { id: number; title: string; amount: number } => !!line);

  return (
    <section className="collection-allocation-summary">
      <h5 className="collection-allocation-summary__title">
        {t('admin.finance.collectionWorkflow.allocationPreviewTitle')}
      </h5>
      {lines.length ? (
        <>
          <p className="muted">
            {t('admin.finance.collectionWorkflow.allocationPreviewIntro', {
              amount: String(collectionAmount),
            })}
          </p>
          <ul className="collection-allocation-summary__list">
            {lines.map((line) => (
              <li key={line.id}>
                <span dir="auto">{line.title}</span>
                <FinanceMoney amount={line.amount} currency={currency} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">{t('admin.finance.collectionWorkflow.allocationPreviewEmpty')}</p>
      )}
      <dl className="detail-list compact collection-allocation-summary__totals">
        <div>
          <dt>{t('admin.finance.collectionWorkflow.allocatedAmount')}</dt>
          <dd><FinanceMoney amount={allocatedTotal} currency={currency} /></dd>
        </div>
        <div>
          <dt>{t('admin.finance.collectionWorkflow.unallocatedAmount')}</dt>
          <dd><FinanceMoney amount={unallocated} currency={currency} /></dd>
        </div>
      </dl>
      {unallocated > 0.0001 ? (
        <p className="collection-allocation-summary__credit-notice" role="status">
          {t('admin.finance.collectionWorkflow.unallocatedBecomesCreditNotice')}
        </p>
      ) : null}
      {!manualMode ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onEditManual}>
          {t('admin.finance.collectionWorkflow.editAllocationManually')}
        </button>
      ) : null}
    </section>
  );
}

/** Reference field label varies by payment method. */
export function collectionReferenceLabel(
  paymentMethod: string,
  t: (key: string) => string,
): string | null {
  if (paymentMethod === 'cash') return null;
  // Cheque reference comes from cheque number via resolveChequeCollectionReference.
  if (paymentMethod === 'cheque' || paymentMethod === 'check') return null;
  if (paymentMethod === 'transfer' || paymentMethod === 'bank_transfer') {
    return t('admin.finance.collectionWorkflow.referenceBankTransfer');
  }
  if (paymentMethod === 'card') {
    return t('admin.finance.collectionWorkflow.referenceCard');
  }
  return t('admin.finance.externalReference');
}

export function collectionReferenceRequired(paymentMethod: string): boolean {
  return (
    paymentMethod === 'transfer' ||
    paymentMethod === 'bank_transfer'
  );
}
