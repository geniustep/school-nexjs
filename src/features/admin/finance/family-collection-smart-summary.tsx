'use client';

import { useState } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  buildFamilyCompactChildSummaries,
  type FamilyChildAllocationLine,
} from '@/features/admin/finance/family-collection-allocation-utils';
import { useT } from '@/features/i18n/locale-context';
import type { FamilyOpenInstallment } from '@/types/family-finance';

function formatServiceLineLabel(
  line: FamilyChildAllocationLine,
  t: (key: string, params?: Record<string, string>) => string,
): string {
  const label = line.serviceLabel || t('admin.finance.billingAccounts.familyCollection.installmentLabel', {
    id: String(line.installmentId),
  });
  if (line.isPartial) {
    return t('admin.finance.billingAccounts.familyCollection.smartSummary.partialLine', {
      label,
      amount: String(line.allocatedAmount),
    });
  }
  return label;
}

function formatCompactServiceSummary(
  lines: FamilyChildAllocationLine[],
  t: (key: string, params?: Record<string, string>) => string,
): string {
  return lines
    .map((line) => {
      const label = line.serviceLabel || t('common.dash');
      if (line.isPartial) {
        return t('admin.finance.billingAccounts.familyCollection.smartSummary.partialCompact', {
          label,
        });
      }
      return `${label} ${line.allocatedAmount}`;
    })
    .join(' + ');
}

export function FamilyCollectionSmartSummary({
  installments,
  allocationInputs,
  currency,
  unallocatedAmount,
}: {
  installments: FamilyOpenInstallment[];
  allocationInputs: Record<number, string>;
  currency?: string | null;
  unallocatedAmount: number;
}) {
  const t = useT();
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<number>>(() => new Set());
  const summaries = buildFamilyCompactChildSummaries({ installments, allocationInputs });

  function toggleDetails(studentId: number) {
    setExpandedStudentIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  if (summaries.length === 0) {
    return (
      <section className="collection-form-section finance-family-smart-summary">
        <h4 className="collection-form-section__title">
          {t('admin.finance.billingAccounts.familyCollection.smartSummary.title')}
        </h4>
        <p className="tiny muted" role="status">
          {t('admin.finance.billingAccounts.familyCollection.smartSummary.empty')}
        </p>
      </section>
    );
  }

  return (
    <section className="collection-form-section finance-family-smart-summary">
      <div className="finance-family-smart-summary__head">
        <h4 className="collection-form-section__title">
          {t('admin.finance.billingAccounts.familyCollection.smartSummary.title')}
        </h4>
        <p className="tiny muted finance-family-smart-summary__explain" role="status">
          {t('admin.finance.billingAccounts.familyCollection.smartSummary.explainability')}
        </p>
      </div>

      <div className="finance-family-smart-summary__cards">
        {summaries.map((summary) => {
          const expanded = expandedStudentIds.has(summary.studentId);
          const compactText = formatCompactServiceSummary(summary.lines, t);

          return (
            <article key={summary.studentId} className="finance-family-smart-summary__card">
              <div className="finance-family-smart-summary__card-main">
                <div className="finance-family-smart-summary__card-head">
                  <strong dir="auto">{summary.studentName}</strong>
                  <FinanceMoney amount={summary.allocatedTotal} currency={currency} />
                </div>
                <p className="tiny muted finance-family-smart-summary__services" dir="auto">
                  {compactText}
                </p>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm finance-family-smart-summary__details-btn"
                  aria-expanded={expanded}
                  onClick={() => toggleDetails(summary.studentId)}
                >
                  {expanded
                    ? t('admin.finance.billingAccounts.familyCollection.smartSummary.hideDetails')
                    : t('admin.finance.billingAccounts.familyCollection.smartSummary.showDetails')}
                </button>
              </div>

              {expanded ? (
                <div className="finance-family-smart-summary__card-details">
                  <ul className="finance-family-smart-summary__lines">
                    {summary.lines.map((line) => (
                      <li key={line.installmentId}>
                        <span dir="auto">{formatServiceLineLabel(line, t)}</span>
                        <FinanceMoney amount={line.allocatedAmount} currency={currency} />
                        {line.isPartial ? (
                          <span className="tiny muted finance-family-smart-summary__partial-remaining">
                            {t('admin.finance.billingAccounts.familyCollection.smartSummary.remainingAfter', {
                              amount: String(line.remainingAfterPayment),
                            })}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <div className="finance-family-smart-summary__card-total">
                    <span>{t('admin.finance.billingAccounts.familyCollection.studentTotal')}</span>
                    <FinanceMoney amount={summary.allocatedTotal} currency={currency} />
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {unallocatedAmount > 0 ? (
        <p className="tiny muted finance-family-smart-summary__unallocated" role="status">
          {t('admin.finance.billingAccounts.familyCollection.unallocatedFamilyBalance', {
            amount: String(unallocatedAmount),
          })}
        </p>
      ) : null}
    </section>
  );
}
