'use client';

import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type { StudentFinanceWorkspace } from '../types';
import type { FinanceOperationHistoryEntry } from '../types/agreement-context';
import {
  hasFinanceOperationsHistoryApi,
  resolveFinanceOperationsHistory,
} from '../utils/resolve-finance-operations-history';
import {
  resolveFinanceOperationStateTone,
  resolveFinanceOperationTone,
  type FinanceOperationTone,
} from '../utils/resolve-finance-operation-presentation';

import {
  FINANCE_PERFORMED_BY_MANAGER_KEY,
  FINANCE_PERFORMED_BY_SYSTEM_KEY,
  FINANCE_PERFORMED_BY_UNAVAILABLE_KEY,
  FINANCE_PERFORMED_BY_USER_KEY,
} from '@/lib/utils/actor-display-name';

function renderPerformedByLabel(
  t: (key: string, params?: Record<string, string>) => string,
  performedByKey: string,
  performedByLabel: string,
): string {
  if (performedByKey === FINANCE_PERFORMED_BY_MANAGER_KEY) {
    return t(FINANCE_PERFORMED_BY_MANAGER_KEY);
  }
  if (performedByKey === FINANCE_PERFORMED_BY_USER_KEY && performedByLabel) {
    return t(FINANCE_PERFORMED_BY_USER_KEY, {
      user: performedByLabel,
    });
  }
  if (performedByKey === FINANCE_PERFORMED_BY_SYSTEM_KEY) {
    return t(FINANCE_PERFORMED_BY_SYSTEM_KEY);
  }
  return t(FINANCE_PERFORMED_BY_UNAVAILABLE_KEY);
}

function OperationTypeBadge({
  label,
  tone,
}: {
  label: string;
  tone: FinanceOperationTone;
}) {
  return (
    <span className={`student-finance-operations-history__type student-finance-operations-history__type--${tone}`}>
      {label}
    </span>
  );
}

function OperationStateBadge({
  label,
  tone,
}: {
  label: string;
  tone: FinanceOperationTone;
}) {
  return (
    <span className={`student-finance-operations-history__state student-finance-operations-history__state--${tone}`}>
      {label}
    </span>
  );
}

function HistoryRow({
  entry,
  labels,
  formatDate,
  t,
}: {
  entry: FinanceOperationHistoryEntry;
  labels: Record<string, string>;
  formatDate: (value: string) => string;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  const typeTone = resolveFinanceOperationTone(entry.operationKind);
  const stateLabel = entry.state ?? t('common.dash');
  const stateTone = resolveFinanceOperationStateTone(entry.state);

  return (
    <tr className="student-finance-operations-history__row">
      <td data-label={labels.date}>
        <time className="student-finance-operations-history__date" dateTime={entry.date ?? undefined}>
          {entry.date ? formatDate(entry.date) : t('common.dash')}
        </time>
      </td>
      <td data-label={labels.type}>
        <OperationTypeBadge label={t(entry.operationLabelKey)} tone={typeTone} />
      </td>
      <td data-label={labels.description} className="student-finance-operations-history__cell-desc">
        <span dir="auto">{entry.description ?? t('common.dash')}</span>
      </td>
      <td data-label={labels.performedBy} className="student-finance-operations-history__cell-user">
        <span dir="auto">{renderPerformedByLabel(t, entry.performedByKey, entry.performedByLabel)}</span>
      </td>
      <td data-label={labels.state}>
        {entry.state ? (
          <OperationStateBadge label={stateLabel} tone={stateTone} />
        ) : (
          t('common.dash')
        )}
      </td>
      <td data-label={labels.reference} className="student-finance-operations-history__cell-ref">
        <code dir="auto">{entry.reference ?? t('common.dash')}</code>
      </td>
      <td data-label={labels.amount} className="student-finance-operations-history__cell-amount">
        {entry.amount != null ? (
          <FinanceMoney amount={entry.amount} currency={entry.currency ?? undefined} />
        ) : (
          <span className="student-finance-operations-history__muted">{t('common.dash')}</span>
        )}
      </td>
    </tr>
  );
}

export function StudentFinanceOperationsHistoryPanel({
  workspace,
}: {
  workspace?: StudentFinanceWorkspace | null;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  const operations = useMemo(() => resolveFinanceOperationsHistory(workspace), [workspace]);
  const operationsApiAvailable = hasFinanceOperationsHistoryApi(workspace);

  const columnLabels = {
    date: t('admin.student360.financeWorkspace.agreementContext.operations.columns.date'),
    type: t('admin.student360.financeWorkspace.agreementContext.operations.columns.type'),
    description: t('admin.student360.financeWorkspace.agreementContext.operations.columns.description'),
    performedBy: t('admin.student360.financeWorkspace.agreementContext.performedByLabel'),
    state: t('admin.student360.financeWorkspace.agreementContext.operations.columns.state'),
    reference: t('admin.student360.financeWorkspace.agreementContext.operations.columns.reference'),
    amount: t('admin.student360.financeWorkspace.agreementContext.operations.columns.amount'),
  };

  return (
    <section
      className="student-finance-operations-history"
      aria-label={t('admin.student360.financeWorkspace.agreementContext.operationsHistoryTitle')}
    >
      <header className="student-finance-operations-history__head">
        <div className="student-finance-operations-history__head-copy">
          <span className="student-finance-operations-history__eyebrow">
            {t('admin.student360.financeWorkspace.tabs.historical')}
          </span>
          <h2>{t('admin.student360.financeWorkspace.agreementContext.operationsHistoryTitle')}</h2>
          <p className="student-finance-operations-history__desc">
            {t('admin.student360.financeWorkspace.historical.description')}
          </p>
        </div>
        {operations.length ? (
          <div className="student-finance-operations-history__summary" aria-live="polite">
            <span className="student-finance-operations-history__summary-value">{operations.length}</span>
            <span className="student-finance-operations-history__summary-label">
              {t('admin.student360.financeWorkspace.historical.countLabel')}
            </span>
          </div>
        ) : null}
      </header>

      {operations.length ? (
        <div className="student-finance-operations-history__table-shell">
          <div className="student-finance-operations-history__table-wrap">
            <table className="student-finance-operations-history__table">
              <thead>
                <tr>
                  <th scope="col">{columnLabels.date}</th>
                  <th scope="col">{columnLabels.type}</th>
                  <th scope="col">{columnLabels.description}</th>
                  <th scope="col">{columnLabels.performedBy}</th>
                  <th scope="col">{columnLabels.state}</th>
                  <th scope="col">{columnLabels.reference}</th>
                  <th scope="col">{columnLabels.amount}</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((entry) => (
                  <HistoryRow
                    key={entry.id}
                    entry={entry}
                    labels={columnLabels}
                    formatDate={formatDate}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className={`student-finance-operations-history__empty${operationsApiAvailable ? ' student-finance-operations-history__empty--records' : ''}`}
          role="status"
        >
          <span className="student-finance-operations-history__empty-icon" aria-hidden="true">
            ◷
          </span>
          <p>
            {operationsApiAvailable
              ? t('admin.student360.financeWorkspace.agreementContext.operations.empty')
              : t('admin.student360.financeWorkspace.agreementContext.operations.unavailable')}
          </p>
        </div>
      )}
    </section>
  );
}
