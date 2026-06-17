'use client';

import { useState } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceAmountInput } from '@/features/admin/finance/finance-amount-input';
import { InstallmentCompositeStatus } from '@/features/admin/student-finance/components/installment-status-badges';
import { formatInstallmentLabel } from '@/features/admin/finance/collection-labels';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { formatPeriodRange } from '@/features/admin/student-finance/utils/format-period';
import type { CollectibleItem, CollectibleItemsSummary } from '@/types/student-financial-overview';

export function CollectionDuesSelectionStep({
  items,
  summary,
  loading,
  currency,
  selectedIds,
  amount,
  onAmountChange,
  onSelectedIdsChange,
  onQuickSelect,
}: {
  items: CollectibleItem[];
  summary: CollectibleItemsSummary | null;
  loading: boolean;
  currency?: string | null;
  selectedIds: number[];
  amount: string;
  onAmountChange: (value: string) => void;
  onSelectedIdsChange: (ids: number[]) => void;
  onQuickSelect: (mode: 'overdue' | 'due' | 'next' | 'all_open' | 'custom') => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  const [showExtraSummary, setShowExtraSummary] = useState(false);

  function toggle(id: number, checked: boolean, selectable: boolean) {
    if (!selectable) return;
    if (checked) onSelectedIdsChange([...new Set([...selectedIds, id])]);
    else onSelectedIdsChange(selectedIds.filter((value) => value !== id));
  }

  if (loading) {
    return <p className="muted">{t('admin.finance.collections.loadingReceivables')}</p>;
  }

  if (!items.length) {
    return <p className="muted">{t('admin.student360.financeWorkspace.collections.noCollectibleItems')}</p>;
  }

  return (
    <section className="collection-form-section collection-dues-selection">
      <dl className="detail-list compact collection-dues-selection__summary collection-dues-selection__summary--compact">
        <div>
          <dt>{t('admin.student360.financeWorkspace.metrics.dueToDate')}</dt>
          <dd><FinanceMoney amount={summary?.due_to_date} currency={currency} /></dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.metrics.overdue')}</dt>
          <dd><FinanceMoney amount={summary?.overdue} currency={currency} /></dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.metrics.remaining')}</dt>
          <dd><FinanceMoney amount={summary?.remaining} currency={currency} /></dd>
        </div>
      </dl>

      <button
        type="button"
        className="btn btn--ghost btn--sm collection-dues-selection__expand"
        onClick={() => setShowExtraSummary((v) => !v)}
      >
        {showExtraSummary
          ? t('admin.finance.collectionWorkflow.hideExtraSummary')
          : t('admin.finance.collectionWorkflow.showExtraSummary')}
      </button>

      {showExtraSummary ? (
        <dl className="detail-list compact collection-dues-selection__summary collection-dues-selection__summary--extra">
          <div>
            <dt>{t('admin.student360.financeWorkspace.metrics.annualTotal')}</dt>
            <dd><FinanceMoney amount={summary?.annual_total} currency={currency} /></dd>
          </div>
          <div>
            <dt>{t('admin.student360.financeWorkspace.metrics.paid')}</dt>
            <dd><FinanceMoney amount={summary?.paid} currency={currency} /></dd>
          </div>
          <div>
            <dt>{t('admin.student360.financeWorkspace.metrics.upcoming')}</dt>
            <dd><FinanceMoney amount={summary?.upcoming} currency={currency} /></dd>
          </div>
        </dl>
      ) : null}

      <div className="collection-dues-selection__quick row">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onQuickSelect('overdue')}>
          {t('admin.finance.collectionWorkflow.quickOverdue')}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onQuickSelect('due')}>
          {t('admin.finance.collectionWorkflow.quickDueToday')}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onQuickSelect('next')}>
          {t('admin.finance.collectionWorkflow.quickNextInstallment')}
        </button>
      </div>

      <div className="collection-dues-selection__list">
        {items.map((row) => {
          const installmentLike = {
            id: row.installment_id,
            fee_name: row.fee_name,
            fee_type_name: row.fee_type_name,
            display_label: row.display_label,
            period_label: row.period_label,
            period_start: row.period_start,
            period_end: row.period_end,
            due_date: row.due_date,
            amount: row.original_amount,
            remaining_amount: row.remaining_amount,
            timing_status: row.timing_status,
            payment_status: row.payment_status,
            display_state: row.display_state,
          };
          const { title } = formatInstallmentLabel(
            installmentLike as never,
            t,
            formatDate,
            formatPeriodRange,
            locale,
          );
          const checked = selectedIds.includes(row.installment_id);
          return (
            <label
              key={row.installment_id}
              className={`collection-dues-selection__item${checked ? ' is-selected' : ''}${!row.selectable ? ' is-disabled' : ''}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={!row.selectable}
                onChange={(e) => toggle(row.installment_id, e.target.checked, row.selectable)}
              />
              <span className="collection-dues-selection__item-body">
                <strong dir="auto">{title}</strong>
                <span className="collection-dues-selection__item-meta">
                  {row.due_date ? (
                    <span className="tiny muted">{formatDate(row.due_date)}</span>
                  ) : null}
                  <FinanceMoney amount={row.remaining_amount} currency={currency} />
                  <InstallmentCompositeStatus
                    paymentStatus={row.payment_status ?? 'unpaid'}
                    timingStatus={row.timing_status ?? 'not_applicable'}
                  />
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <label className="finance-amount-field collection-dues-selection__amount">
        {t('admin.finance.collectionAmount')}
        <div className="finance-amount-field__input">
          <FinanceAmountInput value={amount} onChange={onAmountChange} />
          {currency ? <span className="finance-amount-field__suffix">{currency}</span> : null}
        </div>
      </label>
    </section>
  );
}
