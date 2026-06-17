'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { formatInstallmentLabel } from '@/features/admin/finance/collection-labels';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { paymentMethodLabel } from '@/lib/utils/finance';
import { formatPeriodRange } from '@/features/admin/student-finance/utils/format-period';
import type { StudentInstallment } from '@/features/admin/student-finance/types';
import type { ResolvedCollectionBilling } from '@/features/admin/finance/collection-billing-context';

export function CollectionReviewStep({
  studentName,
  registrationNumber,
  academicYearName,
  billing,
  journalName,
  paymentMethod,
  collectionDate,
  reference,
  amount,
  currency,
  selectedInstallments,
  allocationInputs,
  allocatedTotal,
}: {
  studentName: string;
  registrationNumber?: string | null;
  academicYearName?: string;
  billing: ResolvedCollectionBilling;
  journalName?: string;
  paymentMethod: string;
  collectionDate: string;
  reference: string;
  amount: number;
  currency?: string | null;
  selectedInstallments: StudentInstallment[];
  allocationInputs: Record<number, string>;
  allocatedTotal: number;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const unallocated = Math.max(0, amount - allocatedTotal);

  return (
    <section className="collection-form-section collection-review-section">
      <h4 className="collection-form-section__title">{t('admin.finance.collectionWorkflow.stepReview')}</h4>
      <p className="muted">{t('admin.finance.collectionWorkflow.reviewDesc')}</p>

      <dl className="detail-list compact collection-review-section__grid">
        <div>
          <dt>{t('admin.finance.collections.columns.student')}</dt>
          <dd dir="auto">{studentName}</dd>
        </div>
        {registrationNumber ? (
          <div>
            <dt>{t('admin.students.columns.code')}</dt>
            <dd dir="ltr">{registrationNumber}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t('admin.finance.academicYear')}</dt>
          <dd>{academicYearName ?? t('common.dash')}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.billingPartyTitle')}</dt>
          <dd dir="auto">{billing.billingPartnerName ?? t('common.dash')}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.paymentJournal')}</dt>
          <dd>{journalName ?? t('common.dash')}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.paymentMethod')}</dt>
          <dd>{paymentMethodLabel(paymentMethod, t)}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.collectionDate')}</dt>
          <dd>{formatDate(collectionDate)}</dd>
        </div>
        {reference ? (
          <div>
            <dt>{t('admin.finance.externalReference')}</dt>
            <dd dir="ltr">{reference}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t('admin.finance.collectionAmount')}</dt>
          <dd>
            <FinanceMoney amount={amount} currency={currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.collectionWorkflow.allocatedAmount')}</dt>
          <dd>
            <FinanceMoney amount={allocatedTotal} currency={currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.collectionWorkflow.unallocatedAmount')}</dt>
          <dd>
            <FinanceMoney amount={unallocated} currency={currency} />
          </dd>
        </div>
      </dl>

      {selectedInstallments.length ? (
        <div className="collection-review-section__allocations">
          <h5>{t('admin.finance.collectionWorkflow.allocationsTitle')}</h5>
          <ul className="collection-review-section__allocation-list">
            {selectedInstallments.map((row) => {
              const { title } = formatInstallmentLabel(row, t, formatDate, formatPeriodRange);
              const allocated = Number(allocationInputs[row.id] ?? 0);
              if (!allocated) return null;
              return (
                <li key={row.id}>
                  <span dir="auto">{title}</span>
                  <FinanceMoney amount={allocated} currency={currency} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
