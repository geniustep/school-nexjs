'use client';

import { FinanceAmountInput } from '@/features/admin/finance/finance-amount-input';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import { familyFinanceServiceTypeLabelKey } from '@/lib/utils/normalize-family-finance';
import type { FamilyOpenInstallment } from '@/types/family-finance';

function formatClassLevel(row: FamilyOpenInstallment, fallback: string): string {
  const parts = [row.level_name, row.class_name, row.section_name].filter(Boolean);
  return parts.length ? parts.join(' — ') : fallback;
}

export function FamilyCollectionAllocationSection({
  installments,
  currency,
  allocationInputs,
  onAllocationChange,
}: {
  installments: FamilyOpenInstallment[];
  currency?: string | null;
  allocationInputs: Record<number, string>;
  onAllocationChange: (values: Record<number, string>) => void;
}) {
  const t = useT();

  const grouped = new Map<number, FamilyOpenInstallment[]>();
  for (const row of installments) {
    if (!grouped.has(row.student_id)) grouped.set(row.student_id, []);
    grouped.get(row.student_id)?.push(row);
  }

  return (
    <section className="collection-form-section">
      <h4 className="collection-form-section__title">
        {t('admin.finance.billingAccounts.familyCollection.manualAllocationTitle')}
      </h4>
      <p className="muted collection-form-section__desc">
        {t('admin.finance.billingAccounts.familyCollection.manualAllocationHint')}
      </p>
      <div className="finance-allocation-cards">
        {Array.from(grouped.entries()).map(([studentId, rows]) => (
          <article key={studentId} className="finance-allocation-card">
            <div className="finance-allocation-card__head">
              <strong dir="auto">{rows[0]?.student_name ?? `#${studentId}`}</strong>
              <span className="tiny muted">
                {formatClassLevel(rows[0], t('common.dash'))}
              </span>
            </div>
            <div className="finance-allocation-card__body">
              {rows.map((row) => (
                <label
                  key={row.installment_id}
                  className="finance-allocation-card__field"
                >
                  <div className="finance-allocation-card__field-label">
                    <span dir="auto">
                      {row.service_label?.trim()
                        ? row.service_label
                        : row.service_type
                          ? t(familyFinanceServiceTypeLabelKey(row.service_type))
                          : t('common.dash')}
                    </span>
                    <span className="tiny muted">
                      {t('admin.finance.remainingAmount')}:{' '}
                      <FinanceMoney amount={row.remaining_amount} currency={currency} />
                    </span>
                  </div>
                  <FinanceAmountInput
                    value={allocationInputs[row.installment_id] ?? ''}
                    onChange={(value) =>
                      onAllocationChange({
                        ...allocationInputs,
                        [row.installment_id]: value,
                      })
                    }
                    aria-label={t('admin.finance.billingAccounts.familyCollection.selectStudent')}
                  />
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
