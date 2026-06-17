'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { InstallmentStatusBadges } from '@/features/admin/student-finance/components/installment-status-badges';
import { formatInstallmentLabel } from '@/features/admin/finance/collection-labels';
import {
  autoAllocateOldest,
  canAllocateToInstallment,
} from '@/features/admin/finance/collection-allocation-utils';
import { FinanceAmountInput } from '@/features/admin/finance/finance-amount-input';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { formatPeriodRange } from '@/features/admin/student-finance/utils/format-period';
import type { StudentInstallment } from '@/features/admin/student-finance/types';

export function ReceivableAllocationSection({
  installments,
  loading,
  currency,
  collectionAmount,
  allocationInputs,
  onAllocationChange,
  skipAllocation,
  onSkipAllocationChange,
}: {
  installments: StudentInstallment[];
  loading: boolean;
  currency?: string | null;
  collectionAmount: number;
  allocationInputs: Record<number, string>;
  onAllocationChange: (values: Record<number, string>) => void;
  skipAllocation: boolean;
  onSkipAllocationChange: (skip: boolean) => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const allocatedTotal = Object.values(allocationInputs).reduce((s, v) => s + (Number(v) || 0), 0);
  const unallocated = Math.max(0, (collectionAmount || 0) - allocatedTotal);

  if (loading) {
    return (
      <section className="collection-form-section">
        <h4 className="collection-form-section__title">{t('admin.finance.collections.allocationSection')}</h4>
        <p className="muted">{t('admin.finance.collections.loadingReceivables')}</p>
      </section>
    );
  }

  if (!installments.length) {
    return (
      <section className="collection-form-section">
        <h4 className="collection-form-section__title">{t('admin.finance.collections.allocationSection')}</h4>
        <p className="muted">{t('admin.finance.collections.noOpenReceivables')}</p>
      </section>
    );
  }

  return (
    <section className="collection-form-section collection-allocation-step">
      <div className="collection-form-section__head">
        <h4 className="collection-form-section__title">{t('admin.finance.collections.allocationSection')}</h4>
        <div className="row collection-allocation-step__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={skipAllocation || !collectionAmount}
            onClick={() => onAllocationChange(autoAllocateOldest(installments, collectionAmount))}
          >
            {t('admin.finance.collectionWorkflow.autoAllocateOldest')}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={skipAllocation || !collectionAmount}
            onClick={() => {
              const next: Record<number, string> = {};
              for (const row of installments) {
                if (!canAllocateToInstallment(row)) continue;
                next[row.id] = String(row.remaining_amount ?? 0);
              }
              onAllocationChange(next);
            }}
          >
            {t('admin.finance.collectionWorkflow.fillSelectedDues')}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={skipAllocation}
            onClick={() => onAllocationChange({})}
          >
            {t('admin.finance.collectionWorkflow.clearAllocation')}
          </button>
        </div>
      </div>
      <p className="muted collection-form-section__desc">{t('admin.finance.collections.allocationSectionDesc')}</p>

      <label className="collection-skip-allocation">
        <input
          type="checkbox"
          checked={skipAllocation}
          onChange={(e) => {
            onSkipAllocationChange(e.target.checked);
            if (e.target.checked) onAllocationChange({});
          }}
        />
        <span>{t('admin.finance.collections.skipAllocation')}</span>
      </label>
      <p className="tiny muted">{t('admin.finance.collections.skipAllocationHelp')}</p>

      {!skipAllocation ? (
        <>
          <div className="finance-allocation-summary">
            <div>
              <span className="tiny muted">{t('admin.finance.collectionWorkflow.collectionAmount')}</span>
              <FinanceMoney amount={collectionAmount} currency={currency} />
            </div>
            <div>
              <span className="tiny muted">{t('admin.finance.collectionWorkflow.allocatedAmount')}</span>
              <FinanceMoney amount={allocatedTotal} currency={currency} />
            </div>
            <div>
              <span className="tiny muted">{t('admin.finance.collectionWorkflow.unallocatedAmount')}</span>
              <FinanceMoney amount={unallocated} currency={currency} />
            </div>
          </div>

          <div className="finance-allocation-cards">
            {installments.map((row) => {
              const disabled = !canAllocateToInstallment(row);
              const { title, subtitle } = formatInstallmentLabel(
                row,
                t,
                formatDate,
                formatPeriodRange,
              );
              return (
                <div key={row.id} className={`finance-allocation-card${disabled ? ' is-disabled' : ''}`}>
                  <div className="finance-allocation-card__head">
                    <strong dir="auto">{title}</strong>
                    {subtitle ? <span className="tiny muted">{subtitle}</span> : null}
                  </div>
                  <div className="finance-allocation-card__meta">
                    <span className="tiny muted">{t('admin.finance.remainingAmount')}</span>
                    <FinanceMoney amount={row.remaining_amount} currency={currency} />
                    <InstallmentStatusBadges
                      paymentStatus={row.payment_status ?? 'unpaid'}
                      timingStatus={row.timing_status ?? 'not_applicable'}
                      isVisible={row.is_visible}
                    />
                  </div>
                  <label className="finance-allocation-card__amount">
                    <span className="tiny muted">{t('admin.finance.allocationAmount')}</span>
                    <div className="finance-amount-field">
                      <FinanceAmountInput
                        disabled={disabled || skipAllocation}
                        value={allocationInputs[row.id] ?? ''}
                        onChange={(value) =>
                          onAllocationChange({ ...allocationInputs, [row.id]: value })
                        }
                      />
                      {currency ? (
                        <span className="finance-amount-field__suffix">{currency}</span>
                      ) : null}
                    </div>
                  </label>
                </div>
              );
            })}
          </div>

          <div className="receivable-allocation-table-wrap receivable-allocation-table-wrap--desktop">
            <table className="receivable-allocation-table">
              <thead>
                <tr>
                  <th>{t('admin.finance.collections.columns.service')}</th>
                  <th>{t('admin.finance.dueDate')}</th>
                  <th>{t('admin.finance.remainingAmount')}</th>
                  <th>{t('academic.status')}</th>
                  <th>{t('admin.finance.allocationAmount')}</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((row) => {
                  const disabled = !canAllocateToInstallment(row);
                  const { title, subtitle } = formatInstallmentLabel(
                    row,
                    t,
                    formatDate,
                    formatPeriodRange,
                  );
                  return (
                    <tr key={row.id} className={disabled ? 'is-disabled' : undefined}>
                      <td dir="auto">
                        <strong title={title}>{title}</strong>
                        {subtitle ? <span className="tiny muted block">{subtitle}</span> : null}
                      </td>
                      <td>{formatDate(row.due_date) || t('common.dash')}</td>
                      <td>
                        <FinanceMoney amount={row.remaining_amount} currency={currency} />
                      </td>
                      <td>
                        <InstallmentStatusBadges
                          paymentStatus={row.payment_status ?? 'unpaid'}
                          timingStatus={row.timing_status ?? 'not_applicable'}
                          isVisible={row.is_visible}
                        />
                      </td>
                      <td>
                        <FinanceAmountInput
                          disabled={disabled}
                          value={allocationInputs[row.id] ?? ''}
                          onChange={(value) =>
                            onAllocationChange({ ...allocationInputs, [row.id]: value })
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
