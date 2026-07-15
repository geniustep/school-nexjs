'use client';

import { DataTable, type Column } from '@/components/tables/data-table';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import type { AgreementScheduleItem, FinancialAgreement } from '../types';
import { formatPeriodRange } from '../utils/format-period';
import { hasMeaningfulHistoricalSchedule } from '../utils/resolve-operational-schedule';
import { ScheduleItemStateBadge } from './cheque-dual-badges';

const HISTORICAL_COLLAPSE_THRESHOLD = 8;

export function AgreementHistoricalScheduleSection({
  agreement,
  currency,
}: {
  agreement: FinancialAgreement;
  currency?: string | null;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  if (!hasMeaningfulHistoricalSchedule(agreement)) return null;

  const historicalRows = agreement.historical_installments ?? [];
  const historicalCount =
    agreement.historical_schedule_summary?.installment_count ?? historicalRows.length;
  const historicalTotal = agreement.historical_schedule_summary?.total_amount ?? null;
  const defaultOpen = historicalRows.length > 0 && historicalRows.length < HISTORICAL_COLLAPSE_THRESHOLD;

  const columns: Column<AgreementScheduleItem>[] = [
    {
      key: 'period',
      header: t('admin.student360.financialAgreement.scheduleColumns.period'),
      render: (row) => formatPeriodRange(formatDate, row.period_start, row.period_end),
    },
    {
      key: 'due_date',
      header: t('admin.student360.financialAgreement.scheduleColumns.dueDate'),
      render: (row) => (row.due_date ? formatDate(row.due_date) : t('common.dash')),
    },
    {
      key: 'amount',
      header: t('admin.student360.financialAgreement.scheduleColumns.amount'),
      render: (row) => <FinanceMoney amount={row.amount} currency={currency ?? undefined} />,
    },
    {
      key: 'state',
      header: t('admin.student360.financialAgreement.scheduleColumns.state'),
      render: (row) => <ScheduleItemStateBadge state={row.state ?? 'planned'} />,
    },
  ];

  return (
    <details
      className="student-finance-historical-schedule"
      open={defaultOpen || undefined}
    >
      <summary
        className="student-finance-historical-schedule__summary"
        aria-label={t('admin.student360.financialAgreement.historicalScheduleTitle')}
      >
        <span className="student-finance-historical-schedule__title">
          {t('admin.student360.financialAgreement.historicalScheduleTitle')}
        </span>
        <span className="student-finance-historical-schedule__meta muted tiny">
          {t('admin.student360.financialAgreement.historicalScheduleMeta', {
            count: String(historicalCount),
          })}
        </span>
      </summary>
      <div className="student-finance-historical-schedule__body">
        <p className="student-finance-historical-schedule__desc muted">
          {t('admin.student360.financialAgreement.historicalScheduleDescription')}
        </p>
        <dl className="student-finance-historical-schedule__kpis">
          <div>
            <dt>{t('admin.student360.financialAgreement.historicalScheduleCount')}</dt>
            <dd>
              <span className="mono" dir="ltr">
                {historicalCount}
              </span>
            </dd>
          </div>
          <div>
            <dt>{t('admin.student360.financialAgreement.historicalScheduleTotal')}</dt>
            <dd>
              {historicalTotal != null ? (
                <FinanceMoney amount={historicalTotal} currency={currency ?? undefined} />
              ) : (
                t('common.dash')
              )}
            </dd>
          </div>
        </dl>
        {historicalRows.length === 0 ? (
          <p className="muted tiny" role="status">
            {t('admin.student360.financialAgreement.historicalScheduleEmpty')}
          </p>
        ) : (
          <div className="student-finance-table-wrap">
            <DataTable
              columns={columns}
              rows={historicalRows}
              rowKey={(row) =>
                row.id ?? `hist-${row.period_start ?? 'p'}-${row.due_date ?? 'd'}-${row.amount ?? 0}`
              }
            />
          </div>
        )}
      </div>
    </details>
  );
}
