'use client';

import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { normalizeBillingAccountSummary } from '@/lib/utils/normalize-billing-account';
import type { ChequeSummary } from '@/types/student-financial-overview';
import type { StudentFinanceOverviewMetrics } from '../utils/resolve-student-finance-overview';
import styles from './student-finance-executive-summary.module.css';

type MetricTone = 'neutral' | 'green' | 'amber' | 'red' | 'blue';

function toneClass(tone?: MetricTone): string {
  return tone ? `student-finance-kpi--${tone}` : 'student-finance-kpi--neutral';
}

export function StudentFinanceExecutiveSummary({
  metrics,
  chequeSummary,
  billingContextHeadlineKey,
  billingContextMessage,
}: {
  metrics: StudentFinanceOverviewMetrics | null;
  chequeSummary?: ChequeSummary | null;
  billingContextHeadlineKey?: string | null;
  billingContextMessage?: string | null;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const billingPartnerId = metrics?.billing_partner_id ?? null;
  const familyState = useAdminResource<unknown>(
    billingPartnerId ? endpoints.admin.financeBillingAccountSummary(billingPartnerId) : null,
  );
  const familySummary = useMemo(
    () => normalizeBillingAccountSummary(familyState.data),
    [familyState.data],
  );

  const { primaryKpis, secondaryKpis, health } = useMemo(() => {
    if (!metrics) {
      return { primaryKpis: [], secondaryKpis: [], health: null };
    }

    const currency = metrics.currency;
    const overdue = metrics.overdue ?? 0;
    const hasPendingCheque = metrics.has_pending_cheque;

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
      },
      {
        key: 'overdue',
        label: t('admin.student360.financeWorkspace.executive.overdue'),
        value: <FinanceMoney amount={metrics.overdue} currency={currency ?? undefined} />,
        tone: overdue > 0 ? ('red' as const) : ('green' as const),
      },
      {
        key: 'paid_confirmed',
        label: t('admin.student360.financeWorkspace.executive.paidConfirmed'),
        value: <FinanceMoney amount={metrics.paid_confirmed} currency={currency ?? undefined} />,
        tone: 'green' as const,
      },
    ];

    const secondaryKpis = [
      ...((metrics.unconfirmed_coverage ?? 0) > 0
        ? [
            {
              key: 'unconfirmed_coverage',
              label: t('admin.student360.financeWorkspace.executive.unconfirmedCoverage'),
              value: (
                <FinanceMoney
                  amount={metrics.unconfirmed_coverage}
                  currency={currency ?? undefined}
                />
              ),
            },
          ]
        : []),
      {
        key: 'net_assessed',
        label: t('admin.student360.financeWorkspace.executive.netAssessed'),
        value: <FinanceMoney amount={metrics.annual_total} currency={currency ?? undefined} />,
      },
      {
        key: 'next_installment',
        label: t('admin.student360.financeWorkspace.executive.nextInstallment'),
        value: nextInstallmentValue,
      },
    ];

    return {
      primaryKpis,
      secondaryKpis,
      health: { hasPendingCheque },
    };
  }, [metrics, t, formatDate]);

  if (!metrics) return null;

  const familyStudentCount =
    familySummary?.summary.student_count ?? familySummary?.students.length ?? 0;
  const showFamilySummary = familyStudentCount > 1 && familySummary != null;
  const familyName =
    familySummary?.billing_account.display_name ?? familySummary?.billing_account.name ?? null;

  return (
    <section
      className={`student-finance-hero ${styles.summaryRoot}`}
      aria-label={t('admin.student360.financeWorkspace.pageTitle')}
    >
      {billingContextHeadlineKey ? (
        <div className="student-finance-hero__context" role="status">
          <p className="student-finance-hero__context-title">{t(billingContextHeadlineKey)}</p>
          {billingContextMessage ? (
            <p className="student-finance-hero__context-hint tiny muted">{billingContextMessage}</p>
          ) : (
            <p className="student-finance-hero__context-hint tiny muted">
              {t('admin.student360.financeWorkspace.billingContext.noActiveAgreementManageable')}
            </p>
          )}
        </div>
      ) : null}

      <div className={`student-finance-hero__primary ${styles.primary}`}>
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

      {secondaryKpis.length ? (
        <dl className={styles.secondaryFacts}>
          {secondaryKpis.map((item) => (
            <div key={item.key} className={styles.secondaryFact}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {showFamilySummary && familySummary ? (
        <aside className={styles.familySummary} aria-label={familyName ?? undefined}>
          <div className={styles.familyHead}>
            <div className={styles.familyIdentity}>
              {familyName ? (
                <strong className={styles.familyName} dir="auto">
                  {familyName}
                </strong>
              ) : null}
              <span className={styles.familyCount}>
                {t('admin.finance.billingAccounts.studentCountLabel', {
                  count: String(familyStudentCount),
                })}
              </span>
            </div>
          </div>
          <dl className={styles.familyMetrics}>
            <div className={styles.familyMetric}>
              <dt>{t('admin.student360.financeWorkspace.executive.remainingActual')}</dt>
              <dd>
                <FinanceMoney
                  amount={familySummary.summary.total_remaining}
                  currency={familySummary.summary.currency}
                />
              </dd>
            </div>
            <div className={styles.familyMetric}>
              <dt>{t('admin.student360.financeWorkspace.executive.overdue')}</dt>
              <dd>
                <FinanceMoney
                  amount={familySummary.summary.total_overdue}
                  currency={familySummary.summary.currency}
                />
              </dd>
            </div>
            <div className={styles.familyMetric}>
              <dt>{t('admin.student360.financeWorkspace.executive.paidConfirmed')}</dt>
              <dd>
                <FinanceMoney
                  amount={familySummary.summary.confirmed_paid}
                  currency={familySummary.summary.currency}
                />
              </dd>
            </div>
          </dl>
        </aside>
      ) : null}

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

      {(chequeSummary?.rejected_count ?? 0) > 0 ? (
        <div
          className="student-finance-hero__insight student-finance-hero__insight--danger"
          role="alert"
        >
          <div className="student-finance-hero__insight-icon" aria-hidden="true">
            !
          </div>
          <div className="student-finance-hero__insight-body">
            <p className="student-finance-hero__insight-title">
              {chequeSummary!.rejected_count === 1
                ? t('admin.student360.financeWorkspace.executive.rejectedChequesAlertOnePrefix')
                : t('admin.student360.financeWorkspace.executive.rejectedChequesAlertManyPrefix', {
                    count: String(chequeSummary!.rejected_count),
                  })}{' '}
              <FinanceMoney
                amount={chequeSummary!.rejected_amount}
                currency={metrics.currency ?? undefined}
              />
              {'. '}
              {t('admin.student360.financeWorkspace.executive.rejectedChequesReviewHint')}
            </p>
          </div>
        </div>
      ) : null}

      {(chequeSummary?.cancelled_count ?? 0) > 0 ? (
        <div
          className="student-finance-hero__insight student-finance-hero__insight--warn"
          role="note"
        >
          <div className="student-finance-hero__insight-icon" aria-hidden="true">
            !
          </div>
          <div className="student-finance-hero__insight-body">
            <p className="student-finance-hero__insight-title">
              {chequeSummary!.cancelled_count === 1
                ? t('admin.student360.financeWorkspace.executive.cancelledChequesAlertOnePrefix')
                : t('admin.student360.financeWorkspace.executive.cancelledChequesAlertManyPrefix', {
                    count: String(chequeSummary!.cancelled_count),
                  })}{' '}
              <FinanceMoney
                amount={chequeSummary!.cancelled_amount}
                currency={metrics.currency ?? undefined}
              />
            </p>
            <p className="student-finance-hero__insight-hint">
              {chequeSummary!.cancelled_note?.trim() ||
                t('admin.student360.financeWorkspace.metrics.cancelledChequesNote')}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
