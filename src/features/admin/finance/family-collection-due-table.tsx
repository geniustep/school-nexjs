'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { buildFamilyDueRows, formatFamilyDueDate } from '@/features/admin/finance/family-collection-due-rows';
import { familyFinanceServiceTypeLabelKey } from '@/lib/utils/normalize-family-finance';
import { useT } from '@/features/i18n/locale-context';
import type { FamilyOpenInstallment } from '@/types/family-finance';

export function FamilyCollectionDueTable({
  installments,
  allocationInputs,
  currency,
}: {
  installments: FamilyOpenInstallment[];
  allocationInputs: Record<number, string>;
  currency?: string | null;
}) {
  const t = useT();
  const rows = buildFamilyDueRows(installments, allocationInputs);
  const label = (key: string) => t(`admin.finance.billingAccounts.familyCollection.${key}`);

  return (
    <section className="finance-family-due" aria-labelledby="family-due-title" data-testid="family-collection-due-table">
      <div className="finance-family-due__heading">
        <h4 id="family-due-title">{label('dueTableTitle')}</h4>
        <p className="tiny muted">{label('dueTableExplanation')}</p>
      </div>
      {rows.length === 0 ? (
        <p className="tiny muted" role="status">{label('dueTableEmpty')}</p>
      ) : (
        <div className="finance-family-due__scroll" tabIndex={0} role="region" aria-label={label('dueTableTitle')}>
          <table className="finance-family-due__table">
            <thead><tr>
              <th scope="col">{label('dueTableStudent')}</th>
              <th scope="col">{label('dueTableDate')}</th>
              <th scope="col" className="finance-family-due__money">{label('dueTableRemaining')}</th>
              <th scope="col" className="finance-family-due__money">{label('dueTableAllocation')}</th>
            </tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.installment_id}>
                  <td>
                    <strong dir="auto">{row.student_name?.trim() || `#${row.student_id}`}</strong>
                    <span className="finance-family-due__service" dir="auto">
                      {row.service_label?.trim()
                        ? row.service_label
                        : row.service_type
                          ? t(familyFinanceServiceTypeLabelKey(row.service_type))
                          : t('admin.finance.billingAccounts.familyCollection.installmentLabel', { id: String(row.installment_id) })}
                    </span>
                    {row.collectible === false ? <span className="finance-family-due__flag">{label('dueTableNotCollectible')}</span> : null}
                  </td>
                  <td>
                    <span>{formatFamilyDueDate(row.due_date)}</span>
                    {row.is_overdue ? <span className="finance-family-due__overdue">{label('dueTableOverdue')}</span> : null}
                  </td>
                  <td className="finance-family-due__money"><FinanceMoney amount={row.remainingDue} currency={currency} /></td>
                  <td className="finance-family-due__money">{row.allocatedNow > 0
                    ? <FinanceMoney amount={row.allocatedNow} currency={currency} /> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
