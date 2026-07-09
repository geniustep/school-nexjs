'use client';

import { useMemo } from 'react';
import { FinanceAmountInput } from '@/features/admin/finance/finance-amount-input';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  buildFamilyStudentAllocationSummaries,
  filterFamilyInstallments,
  type FamilyInstallmentFilter,
} from '@/features/admin/finance/family-collection-allocation-utils';
import { useT } from '@/features/i18n/locale-context';
import { familyFinanceServiceTypeLabelKey } from '@/lib/utils/normalize-family-finance';
import type { FamilyOpenInstallment } from '@/types/family-finance';

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
  compactAfterSuggestion = false,
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
  highlightStudentId?: number;
  compactAfterSuggestion?: boolean;
}) {
  const t = useT();

  const filteredInstallments = useMemo(
    () => filterFamilyInstallments(installments, installmentFilter, allocationInputs),
    [installments, installmentFilter, allocationInputs],
  );

  const filteredInstallmentIds = useMemo(
    () => new Set(filteredInstallments.map((row) => row.installment_id)),
    [filteredInstallments],
  );

  const summaries = useMemo(
    () =>
      buildFamilyStudentAllocationSummaries({
        installments,
        allocationInputs,
        filteredInstallmentIds,
      }),
    [installments, allocationInputs, filteredInstallmentIds],
  );

  const grouped = useMemo(() => {
    const map = new Map<number, FamilyOpenInstallment[]>();
    for (const row of filteredInstallments) {
      if (!map.has(row.student_id)) map.set(row.student_id, []);
      map.get(row.student_id)?.push(row);
    }
    return map;
  }, [filteredInstallments]);

  function toggleStudent(studentId: number) {
    const next = new Set(expandedStudentIds);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    onExpandedStudentIdsChange(next);
  }

  return (
    <section className="collection-form-section finance-family-allocation-workspace">
      <div className="finance-family-allocation-workspace__head">
        <h4 className="collection-form-section__title">
          {t('admin.finance.billingAccounts.familyCollection.allocationWorkspaceTitle')}
        </h4>
        {compactAfterSuggestion ? (
          <p className="tiny muted finance-family-allocation-workspace__hint" role="status">
            {t('admin.finance.billingAccounts.familyCollection.suggestionExplainability')}
          </p>
        ) : (
          <p className="tiny muted finance-family-allocation-workspace__hint" role="status">
            {t('admin.finance.billingAccounts.familyCollection.manualAllocationHint')}
          </p>
        )}
      </div>

      <div
        className="finance-family-allocation-filters"
        role="group"
        aria-label={t('admin.finance.billingAccounts.familyCollection.filters.label')}
      >
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`finance-family-allocation-filters__btn${
              installmentFilter === filter ? ' is-active' : ''
            }`}
            aria-pressed={installmentFilter === filter}
            onClick={() => onInstallmentFilterChange(filter)}
          >
            {t(`admin.finance.billingAccounts.familyCollection.filters.${filter}`)}
          </button>
        ))}
      </div>

      {summaries.length === 0 ? (
        <p className="tiny muted finance-family-allocation-workspace__empty">
          {t('admin.finance.billingAccounts.familyCollection.filters.empty')}
        </p>
      ) : (
        <div className="finance-family-allocation-students">
          {summaries.map((summary) => {
            const rows = grouped.get(summary.studentId) ?? [];
            const expanded = expandedStudentIds.has(summary.studentId);
            const isHighlighted = highlightStudentId === summary.studentId;

            return (
              <article
                key={summary.studentId}
                className={`finance-family-allocation-student${
                  expanded ? ' is-expanded' : ''
                }${isHighlighted ? ' is-highlighted' : ''}`}
              >
                <div className="finance-family-allocation-student__summary">
                  <div className="finance-family-allocation-student__identity">
                    <strong dir="auto">{summary.studentName}</strong>
                    {summary.classLabel ? (
                      <span className="tiny muted" dir="auto">
                        {summary.classLabel}
                      </span>
                    ) : null}
                  </div>
                  <dl className="finance-family-allocation-student__metrics">
                    <div>
                      <dt>{t('admin.finance.billingAccounts.familyCollection.childSummary.openTotal')}</dt>
                      <dd><FinanceMoney amount={summary.openTotal} currency={currency} /></dd>
                    </div>
                    <div>
                      <dt>{t('admin.finance.billingAccounts.familyCollection.childSummary.allocatedNow')}</dt>
                      <dd><FinanceMoney amount={summary.allocatedNow} currency={currency} /></dd>
                    </div>
                    <div>
                      <dt>{t('admin.finance.billingAccounts.familyCollection.childSummary.remaining')}</dt>
                      <dd><FinanceMoney amount={summary.remainingAfter} currency={currency} /></dd>
                    </div>
                    <div>
                      <dt>{t('admin.finance.billingAccounts.familyCollection.childSummary.itemCount')}</dt>
                      <dd>{summary.allocatedItemCount}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm finance-family-allocation-student__toggle"
                    aria-expanded={expanded}
                    onClick={() => toggleStudent(summary.studentId)}
                  >
                    {expanded
                      ? t('admin.finance.billingAccounts.familyCollection.childSummary.hideDetails')
                      : summary.hasAllocations
                        ? t('admin.finance.billingAccounts.familyCollection.childSummary.editAllocation')
                        : t('admin.finance.billingAccounts.familyCollection.childSummary.showDetails')}
                  </button>
                </div>

                {expanded && rows.length > 0 ? (
                  <div className="finance-family-allocation-student__details">
                    {rows.map((row) => (
                      <label
                        key={row.installment_id}
                        className="finance-allocation-card__field finance-family-allocation-student__field"
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
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {collectionAmount > 0 ? (
        <p className="tiny muted finance-family-allocation-workspace__amount-hint" role="status">
          {t('admin.finance.billingAccounts.familyCollection.childSummary.collectionAmountHint', {
            amount: String(collectionAmount),
          })}
        </p>
      ) : null}
    </section>
  );
}
