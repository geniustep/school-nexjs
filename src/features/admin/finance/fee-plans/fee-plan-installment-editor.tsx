'use client';

import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { roundMoney } from './fee-plan-payload';
import type { FeePlanInstallmentScheduleItem } from '@/types/finance';

export function FeePlanInstallmentEditor({
  amount,
  schedule,
  onChange,
  error,
}: {
  amount: number;
  schedule: FeePlanInstallmentScheduleItem[];
  onChange: (schedule: FeePlanInstallmentScheduleItem[]) => void;
  error?: string | null;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const total = useMemo(() => roundMoney(schedule.reduce((sum, row) => sum + row.amount, 0)), [schedule]);
  const diff = roundMoney(amount - total);

  function updateRow(index: number, patch: Partial<FeePlanInstallmentScheduleItem>) {
    onChange(
      schedule.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  return (
    <div className="fee-plan-installment-editor">
      <table className="data fee-plan-installment-editor__table">
        <thead>
          <tr>
            <th>{t('admin.finance.feePlansWorkspace.installmentNumber')}</th>
            <th>{t('admin.finance.dueDate')}</th>
            <th>{t('admin.finance.lineAmount')}</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((row, index) => (
            <tr key={row.sequence}>
              <td>{row.sequence}</td>
              <td>
                <input
                  className="input input--sm"
                  type="date"
                  value={row.due_date}
                  onChange={(e) => updateRow(index, { due_date: e.target.value })}
                  aria-label={t('admin.finance.dueDate')}
                />
              </td>
              <td>
                <input
                  className="input input--sm"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={row.amount}
                  onChange={(e) => updateRow(index, { amount: Number(e.target.value) })}
                  aria-label={t('admin.finance.lineAmount')}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="fee-plan-installment-editor__footer">
        <span className="muted">
          {t('admin.finance.feePlansWorkspace.scheduleTotal')}:{' '}
          <FinanceMoney amount={total} />
        </span>
        <span className={diff !== 0 ? 'form-error' : 'muted'}>
          {t('admin.finance.feePlansWorkspace.scheduleDiff')}:{' '}
          <FinanceMoney amount={diff} />
        </span>
      </div>
      {error && <p className="form-error">{error}</p>}
      {schedule.length > 0 && schedule[0]?.due_date && (
        <p className="muted fee-plan-installment-editor__hint">
          {t('admin.finance.feePlansWorkspace.schedulePreviewHint', {
            date: formatDate(schedule[0].due_date),
          })}
        </p>
      )}
    </div>
  );
}
