'use client';

import { FinanceAmountInput } from '@/features/admin/finance/finance-amount-input';
import {
  allocateAvailableToChild,
  clearInstallmentAllocation,
  computeChildAllocatedNow,
  computeChildOpenTotal,
  computeChildRemainingAfter,
  computeProjectedRemaining,
  countChildAllocatedLines,
  familyServiceTypeBadgeClass,
  fillInstallmentAllocation,
  matchesFamilyInstallmentFilter,
  parseAllocationAmount,
  type FamilyInstallmentFilter,
} from '@/features/admin/finance/family-collection-allocation-utils';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { familyFinanceServiceTypeLabelKey } from '@/lib/utils/normalize-family-finance';
import type { FamilyOpenInstallment } from '@/types/family-finance';

function formatClassLevel(row: FamilyOpenInstallment, fallback: string): string {
  const parts = [row.level_name, row.class_name, row.section_name].filter(Boolean);
  return parts.length ? parts.join(' — ') : fallback;
}

function formatInstallmentDisplay(
  row: FamilyOpenInstallment,
  t: (key: string) => string,
): { serviceName: string; periodLabel: string | null } {
  const label = row.service_label?.trim();
  if (label) {
    const parts = label.split(/\s*[—–-]\s+/);
    if (parts.length >= 2) {
      return { serviceName: parts[0], periodLabel: parts.slice(1).join(' — ') };
    }
    return { serviceName: label, periodLabel: null };
  }
  const typeLabel = row.service_type
    ? t(familyFinanceServiceTypeLabelKey(row.service_type))
    : t('common.dash');
  return { serviceName: typeLabel, periodLabel: null };
}

const FILTER_OPTIONS: FamilyInstallmentFilter[] = [
  'all',
  'unallocated',
  'registration',
  'tuition',
  'overdue',
];

export function FamilyCollectionAllocationSection({
  installments,
  currency,
  collectionAmount,
  allocationInputs,
  onAllocationChange,
  installmentFilter,
  onInstallmentFilterChange,
  expandedStudentIds,
  onExpandedStudentIdsChange,
  highlightStudentId,
  compactAfterSuggestion,
}: {
  installments: FamilyOpenInstallment[];
  currency?: string | null;
  collectionAmount: number;
  allocationInputs: Record<number, string>;
  onAllocationChange: (values: Record<number, string>) => void;
  installmentFilter: FamilyInstallmentFilter;
  onInstallmentFilterChange: (filter: FamilyInstallmentFilter) => void;
  expandedStudentIds: Set<number>;
  onExpandedStudentIdsChange: (ids: Set<number>) => void;
  highlightStudentId?: number | null;
  compactAfterSuggestion?: boolean;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  const grouped = new Map<number, FamilyOpenInstallment[]>();
  for (const row of installments) {
    if (!grouped.has(row.student_id)) grouped.set(row.student_id, []);
    grouped.get(row.student_id)?.push(row);
  }

  function toggleStudentExpanded(studentId: number, open: boolean) {
    const next = new Set(expandedStudentIds);
    if (open) next.add(studentId);
    else next.delete(studentId);
    onExpandedStudentIdsChange(next);
  }

  if (!installments.length) {
    return (
      <section className="collection-form-section">
        <h4 className="collection-form-section__title">
          {t('admin.finance.billingAccounts.familyCollection.manualAllocationTitle')}
        </h4>
        <p className="muted collection-form-section__desc">
          {t('admin.finance.billingAccounts.familyCollection.noOpenInstallments')}
        </p>
      </section>
    );
  }

  return (
    <section className="collection-form-section finance-family-allocation-section">
      <div className="collection-form-section__head">
        <h4 className="collection-form-section__title">
          {t('admin.finance.billingAccounts.familyCollection.manualAllocationTitle')}
        </h4>
      </div>
      <p className="muted collection-form-section__desc">
        {t('admin.finance.billingAccounts.familyCollection.manualAllocationHint')}
      </p>

      <div
        className="finance-family-installment-filters"
        role="toolbar"
        aria-label={t('admin.finance.billingAccounts.familyCollection.filterLabel')}
      >
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`btn btn--sm${installmentFilter === filter ? ' btn--secondary' : ' btn--ghost'}`}
            aria-pressed={installmentFilter === filter}
            onClick={() => onInstallmentFilterChange(filter)}
          >
            {t(`admin.finance.billingAccounts.familyCollection.filters.${filter}`)}
          </button>
        ))}
      </div>

      <div className="finance-allocation-cards finance-family-allocation-cards">
        {Array.from(grouped.entries()).map(([studentId, rows]) => {
          const visibleRows = rows.filter((row) =>
            matchesFamilyInstallmentFilter(row, installmentFilter, allocationInputs),
          );
          const openTotal = computeChildOpenTotal(rows);
          const allocatedNow = computeChildAllocatedNow(rows, allocationInputs);
          const remainingAfter = computeChildRemainingAfter(openTotal, allocatedNow);
          const allocatedLineCount = countChildAllocatedLines(rows, allocationInputs);
          const isExpanded = expandedStudentIds.has(studentId);
          const isHighlighted = highlightStudentId != null && studentId === highlightStudentId;

          return (
            <article
              key={studentId}
              className={`finance-allocation-card finance-family-allocation-card${
                isHighlighted ? ' finance-family-allocation-card--highlighted' : ''
              }`}
            >
              <details
                className="finance-family-child-group"
                open={isExpanded}
                onToggle={(event) => {
                  toggleStudentExpanded(studentId, (event.currentTarget as HTMLDetailsElement).open);
                }}
              >
                <summary className="finance-family-child-group__summary">
                  <div className="finance-family-child-group__identity">
                    <strong dir="auto">{rows[0]?.student_name ?? `#${studentId}`}</strong>
                    <span className="tiny muted">
                      {formatClassLevel(rows[0], t('common.dash'))}
                    </span>
                    {isHighlighted ? (
                      <span className="finance-family-child-group__context-badge tiny">
                        {t('admin.finance.billingAccounts.familyCollection.currentStudentContext')}
                      </span>
                    ) : null}
                  </div>
                  <dl className="finance-family-child-summary">
                    <div>
                      <dt>{t('admin.finance.billingAccounts.familyCollection.childOpenTotal')}</dt>
                      <dd><FinanceMoney amount={openTotal} currency={currency} /></dd>
                    </div>
                    <div>
                      <dt>{t('admin.finance.billingAccounts.familyCollection.childAllocatedNow')}</dt>
                      <dd><FinanceMoney amount={allocatedNow} currency={currency} /></dd>
                    </div>
                    <div>
                      <dt>{t('admin.finance.billingAccounts.familyCollection.childRemainingAfter')}</dt>
                      <dd><FinanceMoney amount={remainingAfter} currency={currency} /></dd>
                    </div>
                    <div>
                      <dt>{t('admin.finance.billingAccounts.familyCollection.allocatedLineCount')}</dt>
                      <dd>{allocatedLineCount}</dd>
                    </div>
                  </dl>
                  {allocatedLineCount > 0 && !isExpanded ? (
                    <p className="finance-family-child-compact tiny" role="status">
                      {t('admin.finance.billingAccounts.familyCollection.compactChildSummary', {
                        count: String(allocatedLineCount),
                        amount: String(allocatedNow),
                      })}
                    </p>
                  ) : null}
                  <span className="finance-family-child-group__toggle-hint tiny muted">
                    {isExpanded
                      ? t('admin.finance.billingAccounts.familyCollection.hideDues')
                      : compactAfterSuggestion && allocatedLineCount > 0
                        ? t('admin.finance.billingAccounts.familyCollection.showDetails')
                        : t('admin.finance.billingAccounts.familyCollection.showDues')}
                  </span>
                </summary>

                <div className="finance-family-child-group__body">
                  <div className="finance-family-child-actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={!collectionAmount || collectionAmount <= 0}
                      onClick={() =>
                        onAllocationChange(
                          allocateAvailableToChild(rows, collectionAmount, allocationInputs),
                        )
                      }
                    >
                      {t('admin.finance.billingAccounts.familyCollection.allocateAvailableToChild')}
                    </button>
                    <p className="tiny muted finance-family-child-actions__hint" role="status">
                      {t('admin.finance.billingAccounts.familyCollection.childAllocateHint')}
                    </p>
                  </div>

                  {visibleRows.length === 0 ? (
                    <p className="tiny muted finance-family-child-empty">
                      {t('admin.finance.billingAccounts.familyCollection.childNoVisibleInstallments')}
                    </p>
                  ) : null}

                  {visibleRows.map((row) => {
                    const allocatedInput = parseAllocationAmount(allocationInputs[row.installment_id]);
                    const remainingBefore = row.remaining_amount ?? 0;
                    const projectedRemaining = computeProjectedRemaining(remainingBefore, allocatedInput);
                    const { serviceName, periodLabel } = formatInstallmentDisplay(row, t);
                    const serviceTypeLabel = row.service_type
                      ? t(familyFinanceServiceTypeLabelKey(row.service_type))
                      : null;

                    return (
                      <div
                        key={row.installment_id}
                        className="finance-family-installment-row"
                      >
                        <div className="finance-family-installment-row__header">
                          <div className="finance-family-installment-row__title">
                            <span dir="auto" className="finance-family-installment-row__name">
                              {serviceName}
                            </span>
                            {serviceTypeLabel ? (
                              <span
                                className={familyServiceTypeBadgeClass(row.service_type)}
                              >
                                {serviceTypeLabel}
                              </span>
                            ) : null}
                            {row.is_overdue ? (
                              <span className="finance-family-fee-badge finance-family-fee-badge--overdue">
                                {t('admin.finance.billingAccounts.columns.overdue')}
                              </span>
                            ) : null}
                          </div>
                          {periodLabel ? (
                            <span className="tiny muted finance-family-installment-row__period" dir="auto">
                              {periodLabel}
                            </span>
                          ) : null}
                          {row.due_date ? (
                            <span className="tiny muted finance-family-installment-row__due">
                              {t('admin.finance.dueDate')}: {formatDate(row.due_date)}
                            </span>
                          ) : null}
                        </div>

                        <div className="finance-family-installment-row__metrics">
                          <div>
                            <span className="tiny muted">
                              {t('admin.finance.billingAccounts.familyCollection.remainingBefore')}
                            </span>
                            <FinanceMoney amount={remainingBefore} currency={currency} />
                          </div>
                          <div>
                            <span className="tiny muted">
                              {t('admin.finance.billingAccounts.familyCollection.remainingAfter')}
                            </span>
                            <FinanceMoney amount={projectedRemaining} currency={currency} />
                          </div>
                        </div>

                        <div className="finance-family-installment-row__allocation">
                          <label className="finance-family-installment-row__input">
                            <span className="tiny muted">
                              {t('admin.finance.billingAccounts.familyCollection.allocateNow')}
                            </span>
                            <FinanceAmountInput
                              value={allocationInputs[row.installment_id] ?? ''}
                              onChange={(value) =>
                                onAllocationChange({
                                  ...allocationInputs,
                                  [row.installment_id]: value,
                                })
                              }
                              aria-label={t('admin.finance.allocationAmount')}
                            />
                          </label>
                          <div className="finance-family-installment-row__quick-actions">
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              disabled={!collectionAmount || remainingBefore <= 0}
                              onClick={() =>
                                onAllocationChange(
                                  fillInstallmentAllocation(row, collectionAmount, allocationInputs),
                                )
                              }
                            >
                              {t('admin.finance.billingAccounts.familyCollection.fillRemaining')}
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              disabled={allocatedInput <= 0}
                              onClick={() =>
                                onAllocationChange(
                                  clearInstallmentAllocation(allocationInputs, row.installment_id),
                                )
                              }
                            >
                              {t('admin.finance.billingAccounts.familyCollection.clearLine')}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
