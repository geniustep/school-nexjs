'use client';

import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { Student360MetricGrid } from '@/features/admin/students/components/student-360-metric-grid';
import type { StudentFinanceOverviewMetrics } from '../utils/resolve-student-finance-overview';

export function StudentFinanceExecutiveSummary({
  metrics,
}: {
  metrics: StudentFinanceOverviewMetrics | null;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  const items = useMemo(() => {
    if (!metrics) return [];
    const currency = metrics.currency;
    const nextAmount = metrics.next_installment_amount;
    const nextDate = metrics.next_installment_date;

    const nextInstallmentValue =
      nextAmount != null ? (
        <span className="student-finance-executive-summary__next">
          <FinanceMoney amount={nextAmount} currency={currency ?? undefined} />
          {nextDate ? (
            <span className="tiny muted student-finance-executive-summary__next-date">
              {' — '}
              {formatDate(nextDate)}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="muted">{t('common.dash')}</span>
      );

    return [
      {
        key: 'net_assessed',
        label: t('admin.student360.financeWorkspace.executive.netAssessed'),
        value: <FinanceMoney amount={metrics.annual_total} currency={currency ?? undefined} />,
      },
      {
        key: 'paid_confirmed',
        label: t('admin.student360.financeWorkspace.executive.paidConfirmed'),
        value: <FinanceMoney amount={metrics.paid_confirmed} currency={currency ?? undefined} />,
        tone: 'green' as const,
      },
      {
        key: 'unconfirmed_coverage',
        label: t('admin.student360.financeWorkspace.executive.unconfirmedCoverage'),
        value: <FinanceMoney amount={metrics.unconfirmed_coverage} currency={currency ?? undefined} />,
        tone: (metrics.unconfirmed_coverage ?? 0) > 0 ? ('amber' as const) : undefined,
      },
      {
        key: 'remaining_actual',
        label: t('admin.student360.financeWorkspace.executive.remainingActual'),
        value: <FinanceMoney amount={metrics.remaining_actual} currency={currency ?? undefined} />,
        tone: (metrics.remaining_actual ?? 0) > 0 ? ('red' as const) : undefined,
      },
      {
        key: 'overdue',
        label: t('admin.student360.financeWorkspace.executive.overdue'),
        value: <FinanceMoney amount={metrics.overdue} currency={currency ?? undefined} />,
        tone: (metrics.overdue ?? 0) > 0 ? ('red' as const) : undefined,
      },
      {
        key: 'next_installment',
        label: t('admin.student360.financeWorkspace.executive.nextInstallment'),
        value: nextInstallmentValue,
        tone: 'blue' as const,
      },
    ];
  }, [metrics, t, formatDate]);

  if (!metrics) return null;

  return (
    <section className="student-finance-executive-summary" aria-label={t('admin.student360.financeWorkspace.executive.title')}>
      <Student360MetricGrid variant="finance" items={items} />
      {metrics.has_pending_cheque ? (
        <p className="tiny student-finance-executive-summary__alert" role="status">
          {t('admin.student360.financeWorkspace.executive.pendingChequeAlert')}
        </p>
      ) : null}
      {(metrics.cheque_pending_unallocated ?? 0) > 0 ? (
        <dl className="detail-list compact student-finance-executive-summary__cheque-breakdown">
          <div>
            <dt>{t('admin.student360.financeWorkspace.executive.chequePendingTotal')}</dt>
            <dd>
              <FinanceMoney amount={metrics.cheque_pending_total} currency={metrics.currency ?? undefined} />
            </dd>
          </div>
          <div>
            <dt>{t('admin.student360.financeWorkspace.executive.chequePendingAllocated')}</dt>
            <dd>
              <FinanceMoney amount={metrics.cheque_pending_allocated} currency={metrics.currency ?? undefined} />
            </dd>
          </div>
          <div>
            <dt>{t('admin.student360.financeWorkspace.executive.chequePendingUnallocated')}</dt>
            <dd>
              <FinanceMoney amount={metrics.cheque_pending_unallocated} currency={metrics.currency ?? undefined} />
            </dd>
          </div>
        </dl>
      ) : null}
      {(metrics.remaining_after_pending ?? 0) !== (metrics.remaining_actual ?? 0) ? (
        <p className="tiny muted student-finance-executive-summary__hint">
          {t('admin.student360.financeWorkspace.executive.remainingAfterPendingHint')}{' '}
          <FinanceMoney amount={metrics.remaining_after_pending} currency={metrics.currency ?? undefined} />
        </p>
      ) : null}
    </section>
  );
}
