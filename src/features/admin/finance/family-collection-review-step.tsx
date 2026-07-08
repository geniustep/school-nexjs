'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  familyServiceTypeBadgeClass,
} from '@/features/admin/finance/family-collection-allocation-utils';
import { useFormat } from '@/features/i18n/use-format';
import { useT, type TranslateFn } from '@/features/i18n/locale-context';
import { familyFinanceServiceTypeLabelKey } from '@/lib/utils/normalize-family-finance';
import { paymentMethodLabel } from '@/lib/utils/finance';
import type { FamilyCollectionAllocation, FamilyOpenInstallment } from '@/types/family-finance';

function formatInstallmentReviewLabel(
  row: FamilyCollectionAllocation,
  installment: FamilyOpenInstallment | undefined,
  t: TranslateFn,
  formatDate: (value: string | null | undefined) => string,
): string {
  const label =
    installment?.service_label?.trim() ||
    row.service_label?.trim() ||
    (installment?.service_type || row.service_type
      ? t(familyFinanceServiceTypeLabelKey(installment?.service_type ?? row.service_type ?? 'other'))
      : t('admin.finance.billingAccounts.familyCollection.installmentLabel', {
          id: String(row.installment_id ?? ''),
        }));

  const due = installment?.due_date ?? row.due_date;
  if (due) {
    return `${label} · ${formatDate(due)}`;
  }
  return label;
}

export function FamilyCollectionReviewStep({
  accountName,
  amount,
  allocated,
  unallocated,
  paymentMethod,
  currency,
  allocations,
  installments,
  onBackToEdit,
}: {
  accountName?: string;
  amount: number;
  allocated: number;
  unallocated: number;
  paymentMethod: string;
  currency?: string | null;
  allocations: FamilyCollectionAllocation[];
  installments: FamilyOpenInstallment[];
  onBackToEdit?: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const installmentById = new Map(installments.map((row) => [row.installment_id, row]));
  const grouped = new Map<number, FamilyCollectionAllocation[]>();
  for (const row of allocations) {
    const studentId =
      row.student_id ??
      installmentById.get(row.installment_id ?? -1)?.student_id ??
      null;
    if (studentId == null) continue;
    if (!grouped.has(studentId)) grouped.set(studentId, []);
    grouped.get(studentId)?.push(row);
  }

  return (
    <section className="collection-form-section collection-review-section finance-family-review-section">
      <div className="collection-form-section__head">
        <h4 className="collection-form-section__title">
          {t('admin.finance.billingAccounts.familyCollection.reviewTitle')}
        </h4>
        {onBackToEdit ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onBackToEdit}>
            {t('admin.finance.billingAccounts.familyCollection.backToEdit')}
          </button>
        ) : null}
      </div>

      <dl className="detail-list compact finance-family-review-meta">
        <div>
          <dt>{t('admin.finance.payer')}</dt>
          <dd dir="auto">{accountName?.trim() || t('common.dash')}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.collectionAmount')}</dt>
          <dd><FinanceMoney amount={amount} currency={currency} /></dd>
        </div>
        <div>
          <dt>{t('admin.finance.paymentMethod')}</dt>
          <dd>{paymentMethodLabel(paymentMethod, t)}</dd>
        </div>
      </dl>

      <div className="finance-family-review-groups">
        {Array.from(grouped.entries()).map(([studentId, rows]) => (
          <article key={studentId} className="card finance-family-review-group">
            <strong dir="auto" className="finance-family-review-group__name">
              {rows[0]?.student_name ??
                installmentById.get(rows[0]?.installment_id ?? -1)?.student_name ??
                `#${studentId}`}
            </strong>
            <ul className="finance-family-review-group__lines">
              {rows.map((row, idx) => {
                const installment = installmentById.get(row.installment_id ?? -1);
                const serviceType = installment?.service_type ?? row.service_type;
                const label = formatInstallmentReviewLabel(row, installment, t, formatDate);
                return (
                  <li key={`${row.installment_id ?? idx}-${idx}`}>
                    <div className="finance-family-review-line__label" dir="auto">
                      {serviceType ? (
                        <span className={familyServiceTypeBadgeClass(serviceType)}>
                          {t(familyFinanceServiceTypeLabelKey(serviceType))}
                        </span>
                      ) : null}
                      <span>{label}</span>
                    </div>
                    <FinanceMoney
                      amount={row.allocated_amount ?? row.amount}
                      currency={currency}
                    />
                  </li>
                );
              })}
            </ul>
            <div className="finance-family-review-group__subtotal">
              <span>{t('admin.finance.billingAccounts.familyCollection.studentTotal')}</span>
              <FinanceMoney
                amount={rows.reduce(
                  (sum, row) => sum + (row.allocated_amount ?? row.amount ?? 0),
                  0,
                )}
                currency={currency}
              />
            </div>
          </article>
        ))}
      </div>

      <div className="finance-allocation-summary finance-family-review-totals">
        <div>
          <span className="tiny muted">
            {t('admin.finance.billingAccounts.familyCollection.preview.allocated')}
          </span>
          <FinanceMoney amount={allocated} currency={currency} />
        </div>
        <div>
          <span className="tiny muted">
            {t('admin.finance.billingAccounts.familyCollection.preview.unallocated')}
          </span>
          <FinanceMoney amount={unallocated} currency={currency} />
        </div>
        <div>
          <span className="tiny muted">{t('admin.finance.collectionAmount')}</span>
          <FinanceMoney amount={amount} currency={currency} />
        </div>
      </div>

      {unallocated > 0 ? (
        <div className="collection-review-credit-notice finance-family-unallocated-warning" role="status">
          <p className="collection-review-credit-notice__title">
            {t('admin.finance.billingAccounts.familyCollection.unallocatedWarningTitle')}
          </p>
          <p className="collection-review-credit-notice__warning">
            {t('admin.finance.billingAccounts.familyCollection.unallocatedNotice', {
              amount: String(unallocated),
            })}
          </p>
        </div>
      ) : null}
    </section>
  );
}
