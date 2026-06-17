'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { InstallmentStatusBadges } from '@/features/admin/student-finance/components/installment-status-badges';
import { formatInstallmentLabel } from '@/features/admin/finance/collection-labels';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { formatPeriodRange } from '@/features/admin/student-finance/utils/format-period';
import type { CollectibleItem, CollectibleItemsSummary } from '@/types/student-financial-overview';

export function CollectionDuesSelectionStep({
  items,
  summary,
  loading,
  currency,
  selectedIds,
  onSelectedIdsChange,
  onQuickSelect,
}: {
  items: CollectibleItem[];
  summary: CollectibleItemsSummary | null;
  loading: boolean;
  currency?: string | null;
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  onQuickSelect: (mode: 'overdue' | 'due' | 'next' | 'all_open' | 'custom') => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();

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

  const nextItem = items
    .filter((row) => row.selectable && row.remaining_amount > 0)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0];

  return (
    <section className="collection-form-section collection-dues-selection">
      <h4 className="collection-form-section__title">{t('admin.finance.collectionWorkflow.stepSelectDues')}</h4>
      <p className="muted">{t('admin.finance.collectionWorkflow.selectDuesDesc')}</p>

      <dl className="detail-list compact collection-dues-selection__summary">
        <div>
          <dt>{t('admin.student360.financeWorkspace.metrics.annualTotal')}</dt>
          <dd><FinanceMoney amount={summary?.annual_total} currency={currency} /></dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.metrics.dueToDate')}</dt>
          <dd><FinanceMoney amount={summary?.due_to_date} currency={currency} /></dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.metrics.paid')}</dt>
          <dd><FinanceMoney amount={summary?.paid} currency={currency} /></dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.metrics.remaining')}</dt>
          <dd><FinanceMoney amount={summary?.remaining} currency={currency} /></dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.metrics.overdue')}</dt>
          <dd><FinanceMoney amount={summary?.overdue} currency={currency} /></dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.metrics.upcoming')}</dt>
          <dd><FinanceMoney amount={summary?.upcoming} currency={currency} /></dd>
        </div>
        {summary?.due_today != null ? (
          <div>
            <dt>{t('admin.finance.collectionWorkflow.dueToday')}</dt>
            <dd><FinanceMoney amount={summary.due_today} currency={currency} /></dd>
          </div>
        ) : null}
      </dl>

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
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onQuickSelect('all_open')}>
          {t('admin.finance.collectionWorkflow.quickFullBalance')}
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
          const { title, subtitle } = formatInstallmentLabel(installmentLike as never, t, formatDate, formatPeriodRange);
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
                {subtitle ? <span className="tiny muted">{subtitle}</span> : null}
                <span className="collection-dues-selection__item-meta">
                  <FinanceMoney amount={row.remaining_amount} currency={currency} />
                  {row.due_date ? <span className="tiny muted">{formatDate(row.due_date)}</span> : null}
                  <InstallmentStatusBadges
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
