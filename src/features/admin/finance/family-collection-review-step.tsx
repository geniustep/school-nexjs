'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import { paymentMethodLabel } from '@/lib/utils/finance';
import type { FamilyCollectionAllocation, FamilyOpenInstallment } from '@/types/family-finance';

export function FamilyCollectionReviewStep({
  amount,
  allocated,
  unallocated,
  paymentMethod,
  currency,
  allocations,
  installments,
}: {
  accountName?: string;
  amount: number;
  allocated: number;
  unallocated: number;
  paymentMethod: string;
  currency?: string | null;
  allocations: FamilyCollectionAllocation[];
  installments: FamilyOpenInstallment[];
}) {
  const t = useT();
  const installmentById = new Map(installments.map((row) => [row.installment_id, row]));
  const grouped = new Map<number, FamilyCollectionAllocation[]>();
  for (const row of allocations) {
    if (row.student_id == null) continue;
    if (!grouped.has(row.student_id)) grouped.set(row.student_id, []);
    grouped.get(row.student_id)?.push(row);
  }

  return (
    <section className="collection-form-section collection-review-section finance-family-review">
      <h4 className="collection-form-section__title">
        {t('admin.finance.billingAccounts.familyCollection.reviewTitle')}
      </h4>

      <div className="finance-family-review__totals">
        <div>
          <span className="tiny muted">{t('admin.finance.collectionAmount')}</span>
          <FinanceMoney amount={amount} currency={currency} />
        </div>
        <div>
          <span className="tiny muted">{t('admin.finance.paymentMethod')}</span>
          <strong>{paymentMethodLabel(paymentMethod, t)}</strong>
        </div>
        <div>
          <span className="tiny muted">{t('admin.finance.billingAccounts.familyCollection.preview.allocated')}</span>
          <FinanceMoney amount={allocated} currency={currency} />
        </div>
        <div>
          <span className="tiny muted">{t('admin.finance.billingAccounts.familyCollection.preview.unallocated')}</span>
          <FinanceMoney amount={unallocated} currency={currency} />
        </div>
      </div>

      <div className="finance-family-review-groups">
        {Array.from(grouped.entries()).map(([studentId, rows]) => {
          const studentTotal = rows.reduce(
            (sum, row) => sum + (row.allocated_amount ?? row.amount ?? 0),
            0,
          );
          return (
            <article key={studentId} className="finance-family-review-group">
              <header className="finance-family-review-group__head">
                <strong dir="auto">
                  {rows[0]?.student_name ??
                    installmentById.get(rows[0]?.installment_id ?? -1)?.student_name ??
                    `#${studentId}`}
                </strong>
                <FinanceMoney amount={studentTotal} currency={currency} />
              </header>
              <ul className="finance-family-review-group__items">
                {rows.map((row, idx) => {
                  const installment = installmentById.get(row.installment_id ?? -1);
                  const label =
                    installment?.service_label?.trim() ||
                    row.service_label?.trim() ||
                    t('admin.finance.billingAccounts.familyCollection.installmentLabel', {
                      id: String(row.installment_id ?? idx + 1),
                    });
                  return (
                    <li key={`${row.installment_id ?? idx}-${idx}`}>
                      <span dir="auto">{label}</span>
                      <FinanceMoney
                        amount={row.allocated_amount ?? row.amount}
                        currency={currency}
                      />
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>

      <div className="finance-family-review__grand-total">
        <span>{t('admin.finance.billingAccounts.familyCollection.reviewGrandTotal')}</span>
        <FinanceMoney amount={allocated} currency={currency} />
      </div>

      {unallocated > 0 ? (
        <p className="tiny muted finance-family-review__unallocated">
          {t('admin.finance.billingAccounts.familyCollection.unallocatedNotice', {
            amount: String(unallocated),
          })}
        </p>
      ) : null}
    </section>
  );
}
