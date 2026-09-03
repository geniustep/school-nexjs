'use client';

import { useEffect, useMemo, useState } from 'react';
import { FinanceAmountInput } from '@/features/admin/finance/finance-amount-input';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { formatInstallmentLabel } from '@/features/admin/finance/collection-labels';
import { canAllocateToInstallment } from '@/features/admin/finance/collection-allocation-utils';
import { InstallmentStatusBadges } from '@/features/admin/student-finance/components/installment-status-badges';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { localeToBcp47, type Locale } from '@/lib/i18n/config';
import { formatPeriodRange } from '@/features/admin/student-finance/utils/format-period';
import type { StudentInstallment } from '@/features/admin/student-finance/types';

type MonthGroup = {
  key: string;
  label: string;
  installments: StudentInstallment[];
};

function installmentMonthKey(row: StudentInstallment): string {
  const value = row.due_date ?? row.period_start ?? row.period_end ?? '';
  const match = value.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : `undated-${row.period_label ?? row.id}`;
}

function monthLabel(key: string, locale: Locale, fallback: string | null | undefined): string {
  const match = key.match(/^(\d{4})-(\d{2})$/);
  if (!match) return fallback?.trim() || '—';
  return new Intl.DateTimeFormat(localeToBcp47(locale), {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}

export function groupInstallmentsByMonth(
  installments: StudentInstallment[],
  locale: Locale,
): MonthGroup[] {
  const groups = new Map<string, StudentInstallment[]>();
  for (const installment of installments) {
    const key = installmentMonthKey(installment);
    groups.set(key, [...(groups.get(key) ?? []), installment]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, rows]) => ({
      key,
      label: monthLabel(key, locale, rows[0]?.period_label),
      installments: rows.sort((left, right) => (left.sequence ?? left.id) - (right.sequence ?? right.id)),
    }));
}

export function MonthlyInstallmentPicker({
  installments,
  loading,
  currency,
  selectedIds,
  allocationInputs,
  onAllocationChange,
}: {
  installments: StudentInstallment[];
  loading: boolean;
  currency?: string | null;
  selectedIds: number[];
  allocationInputs: Record<number, string>;
  onAllocationChange: (values: Record<number, string>) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  const groups = useMemo(() => groupInstallmentsByMonth(installments, locale), [installments, locale]);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  useEffect(() => {
    if (!groups.length) {
      setExpandedMonth(null);
      return;
    }
    setExpandedMonth((current) => (current && groups.some((group) => group.key === current) ? current : groups[0].key));
  }, [groups]);

  function changeInstallment(row: StudentInstallment, checked: boolean) {
    if (!canAllocateToInstallment(row)) return;
    const next = { ...allocationInputs };
    if (checked) next[row.id] = String(row.remaining_amount ?? 0);
    else delete next[row.id];
    onAllocationChange(next);
  }

  function changeMonth(rows: StudentInstallment[], checked: boolean) {
    const next = { ...allocationInputs };
    for (const row of rows) {
      if (!canAllocateToInstallment(row)) continue;
      if (checked) next[row.id] = String(row.remaining_amount ?? 0);
      else delete next[row.id];
    }
    onAllocationChange(next);
  }

  if (loading) {
    return <p className="muted">{t('admin.finance.collections.loadingReceivables')}</p>;
  }

  if (!installments.length) {
    return <p className="muted">{t('admin.finance.collections.noOpenReceivables')}</p>;
  }

  return (
    <section className="monthly-installment-picker" aria-labelledby="monthly-installment-picker-title">
      <div className="monthly-installment-picker__head">
        <div>
          <h4 id="monthly-installment-picker-title">{t('admin.finance.collectionWorkflow.monthlyInstallmentsTitle')}</h4>
          <p className="tiny muted">{t('admin.finance.collectionWorkflow.monthlyInstallmentsHint')}</p>
        </div>
        {selectedIds.length ? (
          <span className="monthly-installment-picker__count">
            {t('admin.finance.collectionWorkflow.monthlyInstallmentsSelected', { count: selectedIds.length })}
          </span>
        ) : null}
      </div>

      <div className="monthly-installment-picker__months">
        {groups.map((group) => {
          const selectable = group.installments.filter(canAllocateToInstallment);
          const selectedCount = selectable.filter((row) => selectedIds.includes(row.id)).length;
          const allSelected = selectable.length > 0 && selectedCount === selectable.length;
          const expanded = expandedMonth === group.key;
          return (
            <section key={group.key} className={`monthly-installment-picker__month${expanded ? ' is-open' : ''}`}>
              <div className="monthly-installment-picker__month-head">
                <button
                  type="button"
                  className="monthly-installment-picker__month-toggle"
                  aria-expanded={expanded}
                  onClick={() => setExpandedMonth(expanded ? null : group.key)}
                >
                  <span className="monthly-installment-picker__chevron" aria-hidden>{expanded ? '⌄' : '›'}</span>
                  <span>
                    <strong>{group.label}</strong>
                    <span className="tiny muted">
                      {t('admin.finance.collectionWorkflow.monthlyInstallmentsMonthMeta', {
                        count: selectable.length,
                        selected: selectedCount,
                      })}
                    </span>
                  </span>
                </button>
                {selectable.length ? (
                  <label className="monthly-installment-picker__month-select">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      aria-label={t('admin.finance.collectionWorkflow.selectMonthInstallments', { month: group.label })}
                      onChange={(event) => changeMonth(selectable, event.target.checked)}
                    />
                    <span>{t('admin.finance.collectionWorkflow.selectAll')}</span>
                  </label>
                ) : null}
              </div>

              {expanded ? (
                <div className="monthly-installment-picker__rows">
                  {group.installments.map((row) => {
                    const selectableRow = canAllocateToInstallment(row);
                    const selected = selectedIds.includes(row.id);
                    const { title, subtitle } = formatInstallmentLabel(row, t, formatDate, formatPeriodRange, locale);
                    return (
                      <div
                        key={row.id}
                        className={`monthly-installment-picker__row${selected ? ' is-selected' : ''}${!selectableRow ? ' is-disabled' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={!selectableRow}
                          aria-label={title}
                          onChange={(event) => changeInstallment(row, event.target.checked)}
                        />
                        <span className="monthly-installment-picker__row-copy">
                          <strong dir="auto">{title}</strong>
                          {subtitle ? <span className="tiny muted">{subtitle}</span> : null}
                          <InstallmentStatusBadges
                            paymentStatus={row.payment_status ?? 'unpaid'}
                            timingStatus={row.timing_status ?? 'not_applicable'}
                            isVisible={row.is_visible}
                          />
                        </span>
                        <span className="monthly-installment-picker__row-amount">
                          {selected ? (
                            <span className="monthly-installment-picker__partial">
                              <FinanceAmountInput
                                value={allocationInputs[row.id] ?? ''}
                                onChange={(value) => onAllocationChange({ ...allocationInputs, [row.id]: value })}
                                aria-label={t('admin.finance.allocationAmount')}
                              />
                              {currency ? <span>{currency}</span> : null}
                            </span>
                          ) : (
                            <FinanceMoney amount={row.remaining_amount} currency={currency} />
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}
