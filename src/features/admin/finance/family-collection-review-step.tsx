'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import { paymentMethodLabel } from '@/lib/utils/finance';
import type { FamilyCollectionAllocation, FamilyOpenInstallment } from '@/types/family-finance';

export function FamilyCollectionReviewStep({
  accountName,
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
    <section className="collection-form-section collection-review-section">
      <h4 className="collection-form-section__title">
        {t('admin.finance.billingAccounts.familyCollection.reviewTitle')}
      </h4>
      <dl className="detail-list compact">
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
            <strong dir="auto">
              {rows[0]?.student_name ?? installmentById.get(rows[0]?.installment_id ?? -1)?.student_name ?? `#${studentId}`}
            </strong>
            <ul>
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
            <div className="tiny">
              {t('admin.finance.billingAccounts.familyCollection.studentTotal')}:{' '}
              <FinanceMoney
                amount={rows.reduce((sum, row) => sum + (row.allocated_amount ?? row.amount ?? 0), 0)}
                currency={currency}
              />
            </div>
          </article>
        ))}
      </div>

      <div className="finance-allocation-summary">
        <div>
          <span className="tiny muted">{t('admin.finance.billingAccounts.familyCollection.preview.allocated')}</span>
          <FinanceMoney amount={allocated} currency={currency} />
        </div>
        <div>
          <span className="tiny muted">{t('admin.finance.billingAccounts.familyCollection.preview.unallocated')}</span>
          <FinanceMoney amount={unallocated} currency={currency} />
        </div>
      </div>
      {unallocated > 0 ? (
        <p className="tiny muted">
          {t('admin.finance.billingAccounts.familyCollection.unallocatedNotice', {
            amount: String(unallocated),
          })}
        </p>
      ) : null}
    </section>
  );
}
