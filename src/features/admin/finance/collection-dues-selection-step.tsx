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
    return (
      <section className="collection-dues-selection">
        <div className="collection-dues-selection__loading">
          <span className="collection-dues-selection__loading-dot" aria-hidden />
          <p className="muted">{t('admin.finance.collections.loadingReceivables')}</p>
        </div>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="collection-dues-selection">
        <div className="collection-dues-selection__empty">
          <p className="muted">{t('admin.student360.financeWorkspace.collections.noCollectibleItems')}</p>
        </div>
      </section>
    );
  }

  const selectableCount = items.filter((row) => row.selectable).length;

  return (
    <section className="collection-form-section collection-dues-selection">
      <header className="collection-dues-selection__head">
        <h4 className="collection-form-section__title">{t('admin.finance.collectionWorkflow.stepDuesAndAmount')}</h4>
        <p className="collection-dues-selection__desc muted">{t('admin.finance.collectionWorkflow.selectDuesDesc')}</p>
      </header>

      <div className="collection-dues-selection__metrics" role="group" aria-label={t('admin.student360.financeWorkspace.pageTitle')}>
        <div className="collection-dues-metric collection-dues-metric--due">
          <span className="collection-dues-metric__label">{t('admin.student360.financeWorkspace.metrics.dueToDate')}</span>
          <span className="collection-dues-metric__value">
            <FinanceMoney amount={summary?.due_to_date} currency={currency} />
          </span>
        </div>
        <div className="collection-dues-metric collection-dues-metric--overdue">
          <span className="collection-dues-metric__label">{t('admin.student360.financeWorkspace.metrics.overdue')}</span>
          <span className="collection-dues-metric__value">
            <FinanceMoney amount={summary?.overdue} currency={currency} />
          </span>
        </div>
        <div className="collection-dues-metric collection-dues-metric--remaining">
          <span className="collection-dues-metric__label">{t('admin.student360.financeWorkspace.metrics.remaining')}</span>
          <span className="collection-dues-metric__value">
            <FinanceMoney amount={summary?.remaining} currency={currency} />
          </span>
        </div>
      </div>

      <button
        type="button"
        className="collection-dues-selection__expand"
        onClick={() => setShowExtraSummary((v) => !v)}
        aria-expanded={showExtraSummary}
      >
        {showExtraSummary
          ? t('admin.finance.collectionWorkflow.hideExtraSummary')
          : t('admin.finance.collectionWorkflow.showExtraSummary')}
      </button>

      {showExtraSummary ? (
        <div className="collection-dues-selection__metrics collection-dues-selection__metrics--extra">
          <div className="collection-dues-metric">
            <span className="collection-dues-metric__label">{t('admin.student360.financeWorkspace.metrics.annualTotal')}</span>
            <span className="collection-dues-metric__value">
              <FinanceMoney amount={summary?.annual_total} currency={currency} />
            </span>
          </div>
          <div className="collection-dues-metric">
            <span className="collection-dues-metric__label">{t('admin.student360.financeWorkspace.metrics.paid')}</span>
            <span className="collection-dues-metric__value">
              <FinanceMoney amount={summary?.paid} currency={currency} />
            </span>
          </div>
          <div className="collection-dues-metric">
            <span className="collection-dues-metric__label">{t('admin.student360.financeWorkspace.metrics.upcoming')}</span>
            <span className="collection-dues-metric__value">
              <FinanceMoney amount={summary?.upcoming} currency={currency} />
            </span>
          </div>
        </div>
      ) : null}

      <div className="collection-dues-selection__quick" role="group" aria-label={t('admin.finance.collectionWorkflow.recordPayment')}>
        <button type="button" className="collection-dues-chip" onClick={() => onQuickSelect('overdue')}>
          {t('admin.finance.collectionWorkflow.quickOverdue')}
        </button>
        <button type="button" className="collection-dues-chip" onClick={() => onQuickSelect('due')}>
          {t('admin.finance.collectionWorkflow.quickDueToday')}
        </button>
        <button type="button" className="collection-dues-chip" onClick={() => onQuickSelect('next')}>
          {t('admin.finance.collectionWorkflow.quickNextInstallment')}
        </button>
      </div>

      <div className="collection-dues-selection__amount-card">
        <div className="collection-dues-selection__amount-head">
          <label className="finance-amount-field collection-dues-selection__amount" htmlFor="collection-dues-amount">
            <span className="finance-amount-field__label">{t('admin.finance.collectionAmount')}</span>
          </label>
          {selectedIds.length > 0 ? (
            <span className="collection-dues-selection__amount-meta tiny muted">
              {selectedIds.length} / {selectableCount}
            </span>
          ) : null}
        </div>
        <div className="finance-amount-field__input collection-dues-selection__amount-input">
          <FinanceAmountInput
            id="collection-dues-amount"
            value={amount}
            onChange={onAmountChange}
            className="input finance-amount-input collection-dues-selection__amount-field"
            aria-label={t('admin.finance.collectionAmount')}
          />
          {currency ? <span className="finance-amount-field__suffix">{currency}</span> : null}
        </div>
      </div>

      <div className="collection-dues-selection__list-head">
        <span className="collection-dues-selection__list-title">
          {t('admin.finance.collectionWorkflow.stepSelectDues')}
        </span>
        <span className="tiny muted collection-dues-selection__list-count">
          {selectedIds.length} / {selectableCount}
        </span>
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
                className="collection-dues-selection__checkbox"
                checked={checked}
                disabled={!row.selectable}
                onChange={(e) => toggle(row.installment_id, e.target.checked, row.selectable)}
              />
              <span className="collection-dues-selection__item-body">
                <strong dir="auto" className="collection-dues-selection__item-title">
                  {title}
                </strong>
                <span className="collection-dues-selection__item-meta">
                  {row.due_date ? (
                    <span className="collection-dues-selection__item-date tiny muted">{formatDate(row.due_date)}</span>
                  ) : null}
                  <span className="collection-dues-selection__item-amount">
                    <FinanceMoney amount={row.remaining_amount} currency={currency} />
                  </span>
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
    </section>
  );
}
