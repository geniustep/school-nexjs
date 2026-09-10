'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale } from '@/features/i18n/locale-context';
import type { ChequeSummary } from '@/types/student-financial-overview';
import type { StudentFinanceOverviewMetrics } from '../utils/resolve-student-finance-overview';
import styles from './student-finance-executive-summary.module.css';

type MetricTone = 'neutral' | 'success' | 'danger' | 'warning';
type MoroccanExecutiveLabel =
  | 'remaining'
  | 'overdue'
  | 'paid'
  | 'pending'
  | 'annualTotal'
  | 'nextInstallment';

const MOROCCAN_ARABIC_LABELS: Record<MoroccanExecutiveLabel, string> = {
  remaining: 'الباقي للأداء',
  overdue: 'المتأخرات',
  paid: 'المؤدى',
  pending: 'مبلغ في انتظار التأكيد',
  annualTotal: 'واجبات السنة',
  nextInstallment: 'القسط المقبل',
};

function metricToneClass(tone: MetricTone): string {
  if (tone === 'danger') return styles.metricDanger;
  if (tone === 'success') return styles.metricSuccess;
  if (tone === 'warning') return styles.metricWarning;
  return styles.metricNeutral;
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
  const { t, locale } = useLocale();
  const { formatDate } = useFormat();

  if (!metrics) return null;

  const currency = metrics.currency;
  const overdue = metrics.overdue ?? 0;
  const hasPendingCheque = metrics.has_pending_cheque;
  const isArabic = locale === 'ar';
  const label = (key: MoroccanExecutiveLabel, translationKey: string) =>
    isArabic ? MOROCCAN_ARABIC_LABELS[key] : t(translationKey);

  const nextInstallmentValue =
    metrics.next_installment_amount != null ? (
      <span className={styles.metricNext}>
        <FinanceMoney amount={metrics.next_installment_amount} currency={currency ?? undefined} />
        {metrics.next_installment_date ? (
          <span className={styles.metricDate}>{formatDate(metrics.next_installment_date)}</span>
        ) : null}
      </span>
    ) : (
      <span className={styles.metricEmpty}>{t('common.dash')}</span>
    );

  const summaryItems = [
    {
      key: 'remaining_actual',
      label: label(
        'remaining',
        'admin.student360.financeWorkspace.executive.remainingActual',
      ),
      value: <FinanceMoney amount={metrics.remaining_actual} currency={currency ?? undefined} />,
      tone: 'neutral' as const,
    },
    {
      key: 'overdue',
      label: label('overdue', 'admin.student360.financeWorkspace.executive.overdue'),
      value: <FinanceMoney amount={metrics.overdue} currency={currency ?? undefined} />,
      tone: overdue > 0 ? ('danger' as const) : ('neutral' as const),
    },
    {
      key: 'paid_confirmed',
      label: label('paid', 'admin.student360.financeWorkspace.executive.paidConfirmed'),
      value: <FinanceMoney amount={metrics.paid_confirmed} currency={currency ?? undefined} />,
      tone: 'success' as const,
    },
    ...((metrics.unconfirmed_coverage ?? 0) > 0
      ? [
          {
            key: 'unconfirmed_coverage',
            label: label(
              'pending',
              'admin.student360.financeWorkspace.executive.unconfirmedCoverage',
            ),
            value: (
              <FinanceMoney
                amount={metrics.unconfirmed_coverage}
                currency={currency ?? undefined}
              />
            ),
            tone: 'warning' as const,
          },
        ]
      : []),
    {
      key: 'annual_total',
      label: label('annualTotal', 'admin.student360.financeWorkspace.executive.netAssessed'),
      value: <FinanceMoney amount={metrics.annual_total} currency={currency ?? undefined} />,
      tone: 'neutral' as const,
    },
    {
      key: 'next_installment',
      label: label(
        'nextInstallment',
        'admin.student360.financeWorkspace.executive.nextInstallment',
      ),
      value: nextInstallmentValue,
      tone: 'neutral' as const,
    },
  ];

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

      <dl className={styles.metricStrip}>
        {summaryItems.map((item) => (
          <div key={item.key} className={`${styles.metric} ${metricToneClass(item.tone)}`}>
            <dt className={styles.metricLabel}>{item.label}</dt>
            <dd className={styles.metricValue}>{item.value}</dd>
          </div>
        ))}
      </dl>

      {hasPendingCheque ? (
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
