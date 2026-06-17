'use client';

import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { InstallmentStatusBadges } from '@/features/admin/student-finance/components/installment-status-badges';
import { formatInstallmentLabel } from '@/features/admin/finance/collection-labels';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { formatPeriodRange } from '@/features/admin/student-finance/utils/format-period';
import type { StudentInstallment } from '@/features/admin/student-finance/types';

export function CollectionDuesSelectionStep({
  installments,
  loading,
  currency,
  selectedIds,
  onSelectedIdsChange,
  onQuickSelect,
}: {
  installments: StudentInstallment[];
  loading: boolean;
  currency?: string | null;
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  onQuickSelect: (mode: 'overdue' | 'due' | 'next' | 'all_open' | 'custom') => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  const summary = useMemo(() => {
    const overdue = installments.filter((row) => row.timing_status === 'overdue');
    const due = installments.filter((row) => row.timing_status === 'due');
    const next = installments
      .filter((row) => (row.remaining_amount ?? 0) > 0)
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0];
    const remainingTotal = installments.reduce((sum, row) => sum + (row.remaining_amount ?? 0), 0);
    return { overdue, due, next, remainingTotal };
  }, [installments]);

  function toggle(id: number, checked: boolean) {
    if (checked) onSelectedIdsChange([...new Set([...selectedIds, id])]);
    else onSelectedIdsChange(selectedIds.filter((value) => value !== id));
  }

  if (loading) {
    return <p className="muted">{t('admin.finance.collections.loadingReceivables')}</p>;
  }

  if (!installments.length) {
    return <p className="muted">{t('admin.student360.financeWorkspace.collections.noCollectibleItems')}</p>;
  }

  return (
    <section className="collection-form-section collection-dues-selection">
      <h4 className="collection-form-section__title">{t('admin.finance.collectionWorkflow.stepSelectDues')}</h4>
      <p className="muted">{t('admin.finance.collectionWorkflow.selectDuesDesc')}</p>

      <dl className="detail-list compact collection-dues-selection__summary">
        <div>
          <dt>{t('admin.student360.financeWorkspace.metrics.overdue')}</dt>
          <dd>
            <FinanceMoney
              amount={summary.overdue.reduce((s, row) => s + (row.remaining_amount ?? 0), 0)}
              currency={currency}
            />
          </dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.metrics.dueToDate')}</dt>
          <dd>
            <FinanceMoney
              amount={summary.due.reduce((s, row) => s + (row.remaining_amount ?? 0), 0)}
              currency={currency}
            />
          </dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.metrics.nextInstallment')}</dt>
          <dd>
            <FinanceMoney amount={summary.next?.remaining_amount} currency={currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.metrics.remaining')}</dt>
          <dd>
            <FinanceMoney amount={summary.remainingTotal} currency={currency} />
          </dd>
        </div>
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
        {installments.map((row) => {
          const { title, subtitle } = formatInstallmentLabel(row, t, formatDate, formatPeriodRange);
          const checked = selectedIds.includes(row.id);
          return (
            <label key={row.id} className={`collection-dues-selection__item${checked ? ' is-selected' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => toggle(row.id, e.target.checked)}
              />
              <span className="collection-dues-selection__item-body">
                <strong dir="auto">{title}</strong>
                {subtitle ? <span className="tiny muted">{subtitle}</span> : null}
                <span className="collection-dues-selection__item-meta">
                  <FinanceMoney amount={row.remaining_amount} currency={currency} />
                  <span>{formatDate(row.due_date)}</span>
                  <InstallmentStatusBadges
                    paymentStatus={row.payment_status ?? 'unpaid'}
                    timingStatus={row.timing_status ?? 'not_applicable'}
                    isVisible={row.is_visible}
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
