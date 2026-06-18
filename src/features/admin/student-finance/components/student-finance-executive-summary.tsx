'use client';

import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type { StudentFinanceOverviewMetrics } from '../utils/resolve-student-finance-overview';

type MetricTone = 'neutral' | 'green' | 'amber' | 'red' | 'blue';

function toneClass(tone?: MetricTone): string {
  return tone ? `student-finance-kpi--${tone}` : 'student-finance-kpi--neutral';
}

export function StudentFinanceExecutiveSummary({
  metrics,
}: {
  metrics: StudentFinanceOverviewMetrics | null;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  const { primaryKpis, secondaryKpis, health } = useMemo(() => {
    if (!metrics) {
      return { primaryKpis: [], secondaryKpis: [], health: null };
    }

    const currency = metrics.currency;
    const overdue = metrics.overdue ?? 0;
    const hasPendingCheque = metrics.has_pending_cheque;
    const unallocated = metrics.cheque_pending_unallocated ?? 0;

    const nextInstallmentValue =
      metrics.next_installment_amount != null ? (
        <span className="student-finance-kpi__next">
          <FinanceMoney amount={metrics.next_installment_amount} currency={currency ?? undefined} />
          {metrics.next_installment_date ? (
            <span className="student-finance-kpi__next-date">{formatDate(metrics.next_installment_date)}</span>
          ) : null}
        </span>
      ) : (
        <span className="student-finance-kpi__empty">{t('common.dash')}</span>
      );

    const primaryKpis = [
      {
        key: 'remaining_actual',
        label: t('admin.student360.financeWorkspace.executive.remainingActual'),
        value: <FinanceMoney amount={metrics.remaining_actual} currency={currency ?? undefined} />,
        tone: (metrics.remaining_actual ?? 0) > 0 ? ('red' as const) : ('green' as const),
        emphasis: true,
      },
      {
        key: 'paid_confirmed',
        label: t('admin.student360.financeWorkspace.executive.paidConfirmed'),
        value: <FinanceMoney amount={metrics.paid_confirmed} currency={currency ?? undefined} />,
        tone: 'green' as const,
        emphasis: true,
      },
      {
        key: 'overdue',
        label: t('admin.student360.financeWorkspace.executive.overdue'),
        value: <FinanceMoney amount={metrics.overdue} currency={currency ?? undefined} />,
        tone: overdue > 0 ? ('red' as const) : ('green' as const),
        emphasis: true,
      },
      {
        key: 'unconfirmed_coverage',
        label: t('admin.student360.financeWorkspace.executive.unconfirmedCoverage'),
        value: <FinanceMoney amount={metrics.unconfirmed_coverage} currency={currency ?? undefined} />,
        tone: (metrics.unconfirmed_coverage ?? 0) > 0 ? ('amber' as const) : ('neutral' as const),
        emphasis: true,
      },
    ];

    const secondaryKpis = [
      {
        key: 'net_assessed',
        label: t('admin.student360.financeWorkspace.executive.netAssessed'),
        value: <FinanceMoney amount={metrics.annual_total} currency={currency ?? undefined} />,
        tone: 'neutral' as const,
      },
      {
        key: 'next_installment',
        label: t('admin.student360.financeWorkspace.executive.nextInstallment'),
        value: nextInstallmentValue,
        tone: 'blue' as const,
      },
    ];

    const health = {
      overdueClear: overdue === 0,
      hasPendingCheque,
      hasUnallocatedCheque: unallocated > 0,
    };

    return { primaryKpis, secondaryKpis, health };
  }, [metrics, t, formatDate]);

  if (!metrics) return null;

  return (
    <section
      className="student-finance-hero"
      aria-label={t('admin.student360.financeWorkspace.executive.title')}
    >
      <div className="student-finance-hero__head">
        <div className="student-finance-hero__title-block">
          <h3 className="student-finance-hero__title">
            {t('admin.student360.financeWorkspace.executive.title')}
          </h3>
        </div>
        <div className="student-finance-hero__status" role="status" aria-live="polite">
          {health?.overdueClear ? (
            <span className="student-finance-hero__chip student-finance-hero__chip--ok">
              {t('admin.student360.financeWorkspace.executive.overdue')}: 0
            </span>
          ) : (
            <span className="student-finance-hero__chip student-finance-hero__chip--danger">
              {t('admin.student360.financeWorkspace.executive.overdue')}
            </span>
          )}
          {health?.hasPendingCheque ? (
            <span className="student-finance-hero__chip student-finance-hero__chip--warn">
              {t('admin.student360.financeWorkspace.metrics.pendingCheques')}
            </span>
          ) : null}
        </div>
      </div>

      <div className="student-finance-hero__primary">
        {primaryKpis.map((item) => (
          <article
            key={item.key}
            className={`student-finance-kpi student-finance-kpi--primary ${toneClass(item.tone)}`}
          >
            <span className="student-finance-kpi__label">{item.label}</span>
            <span className="student-finance-kpi__value">{item.value}</span>
          </article>
        ))}
      </div>

      <div className="student-finance-hero__secondary">
        {secondaryKpis.map((item) => (
          <article key={item.key} className={`student-finance-kpi ${toneClass(item.tone)}`}>
            <span className="student-finance-kpi__label">{item.label}</span>
            <span className="student-finance-kpi__value">{item.value}</span>
          </article>
        ))}
      </div>

      {health?.hasPendingCheque ? (
        <div className="student-finance-hero__insight" role="note">
          <div className="student-finance-hero__insight-icon" aria-hidden="true">
            !
          </div>
          <div className="student-finance-hero__insight-body">
            <p className="student-finance-hero__insight-title">
              {t('admin.student360.financeWorkspace.executive.pendingChequeAlert')}
            </p>
            <dl className="student-finance-hero__insight-stats">
              <div>
                <dt>{t('admin.student360.financeWorkspace.executive.chequePendingTotal')}</dt>
                <dd>
                  <FinanceMoney
                    amount={metrics.cheque_pending_total}
                    currency={metrics.currency ?? undefined}
                  />
                </dd>
              </div>
              <div>
                <dt>{t('admin.student360.financeWorkspace.executive.chequePendingAllocated')}</dt>
                <dd>
                  <FinanceMoney
                    amount={metrics.cheque_pending_allocated}
                    currency={metrics.currency ?? undefined}
                  />
                </dd>
              </div>
              {(metrics.cheque_pending_unallocated ?? 0) > 0 ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.executive.chequePendingUnallocated')}</dt>
                  <dd>
                    <FinanceMoney
                      amount={metrics.cheque_pending_unallocated}
                      currency={metrics.currency ?? undefined}
                    />
                  </dd>
                </div>
              ) : null}
            </dl>
            {(metrics.remaining_after_pending ?? 0) !== (metrics.remaining_actual ?? 0) ? (
              <p className="student-finance-hero__insight-hint">
                {t('admin.student360.financeWorkspace.executive.remainingAfterPendingHint')}{' '}
                <FinanceMoney
                  amount={metrics.remaining_after_pending}
                  currency={metrics.currency ?? undefined}
                />
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
