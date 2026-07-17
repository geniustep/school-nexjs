'use client';

import Link from 'next/link';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import {
  resolveOverviewFinanceStripPresentation,
  type OverviewFinanceStripStageId,
} from '../utils/resolve-overview-finance-strip';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { StudentOverviewFinanceSummary } from '@/types/student-overview';
import { buildStudent360TabHref } from '../utils/student-360-tabs';

const STAGE_LABEL_KEYS: Record<OverviewFinanceStripStageId, string> = {
  obligation: 'admin.student360.overview.financeStrip.stages.obligation',
  paying: 'admin.student360.overview.financeStrip.stages.paying',
  current: 'admin.student360.overview.financeStrip.stages.current',
  overdue: 'admin.student360.overview.financeStrip.stages.overdue',
  complete: 'admin.student360.overview.financeStrip.stages.complete',
};

export function StudentOverviewFinanceStrip({
  studentId,
  financialOverview,
  overviewFinance,
  loading = false,
}: {
  studentId: string | number;
  financialOverview?: StudentFinancialOverview | null;
  overviewFinance?: StudentOverviewFinanceSummary | null;
  loading?: boolean;
}) {
  const t = useT();
  const presentation = resolveOverviewFinanceStripPresentation({
    financialOverview,
    overviewFinance,
  });

  if (loading && !presentation) {
    return (
      <section
        className="student-finance-strip student-finance-strip--loading"
        aria-busy="true"
        aria-label={t('admin.student360.overview.financeStrip.title')}
      >
        <div className="student-finance-strip__skeleton" />
      </section>
    );
  }

  if (!presentation?.available) return null;

  const financeHref = buildStudent360TabHref(studentId, 'finance');
  const fillWidth = `${presentation.paidPercent}%`;

  return (
    <section
      className={`student-finance-strip student-finance-strip--${presentation.tone}`}
      aria-label={t('admin.student360.overview.financeStrip.title')}
    >
      <div className="student-finance-strip__glow" aria-hidden="true" />

      <header className="student-finance-strip__head">
        <div className="student-finance-strip__head-copy">
          <span className="student-finance-strip__eyebrow">
            {t('admin.student360.overview.financeStrip.eyebrow')}
          </span>
          <h2 className="student-finance-strip__title">
            {t('admin.student360.overview.financeStrip.title')}
          </h2>
        </div>
        <Link href={financeHref} className="student-finance-strip__link" scroll={false}>
          {t('admin.student360.overview.financeStrip.openFinance')}
        </Link>
      </header>

      <div className="student-finance-strip__metrics">
        <article className="student-finance-strip__metric">
          <span className="student-finance-strip__metric-label">
            {t('admin.student360.overview.financeStrip.total')}
          </span>
          <span className="student-finance-strip__metric-value">
            <FinanceMoney amount={presentation.total} currency={presentation.currency} />
          </span>
        </article>
        <article className="student-finance-strip__metric student-finance-strip__metric--paid">
          <span className="student-finance-strip__metric-label">
            {t('admin.student360.overview.financeStrip.paid')}
          </span>
          <span className="student-finance-strip__metric-value">
            <FinanceMoney amount={presentation.paid} currency={presentation.currency} />
            <span className="student-finance-strip__percent-chip" dir="ltr">
              {presentation.paidPercent}%
            </span>
          </span>
        </article>
        <article className="student-finance-strip__metric">
          <span className="student-finance-strip__metric-label">
            {t('admin.student360.overview.financeStrip.remaining')}
          </span>
          <span className="student-finance-strip__metric-value">
            <FinanceMoney amount={presentation.remaining} currency={presentation.currency} />
          </span>
        </article>
        {presentation.overdue > 0 ? (
          <article className="student-finance-strip__metric student-finance-strip__metric--overdue">
            <span className="student-finance-strip__metric-label">
              {t('admin.student360.overview.financeStrip.overdue')}
            </span>
            <span className="student-finance-strip__metric-value">
              <FinanceMoney amount={presentation.overdue} currency={presentation.currency} />
            </span>
          </article>
        ) : null}
      </div>

      <div className="student-finance-strip__track-wrap">
        <div
          className="student-finance-strip__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={presentation.paidPercent}
          aria-label={t('admin.student360.overview.financeStrip.progressAria', {
            percent: presentation.paidPercent,
          })}
        >
          <div className="student-finance-strip__fill" style={{ width: fillWidth }} />
          <span
            className="student-finance-strip__marker"
            style={{ insetInlineStart: fillWidth }}
            aria-hidden="true"
          >
            <span className="student-finance-strip__marker-bubble" dir="ltr">
              {presentation.paidPercent}%
            </span>
          </span>
        </div>

        <ol className="student-finance-strip__stages">
          {presentation.stages.map((stage) => {
            const isActive = presentation.activeStage === stage;
            const isPast =
              presentation.stages.indexOf(stage) <
              presentation.stages.indexOf(presentation.activeStage);
            return (
              <li
                key={stage}
                className={[
                  'student-finance-strip__stage',
                  isActive ? 'is-active' : '',
                  isPast ? 'is-past' : '',
                  stage === 'overdue' && presentation.overdue <= 0 ? 'is-muted' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="student-finance-strip__stage-dot" aria-hidden="true" />
                <span className="student-finance-strip__stage-label">{t(STAGE_LABEL_KEYS[stage])}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
