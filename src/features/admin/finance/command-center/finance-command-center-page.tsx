'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ApiErrorView, EmptyState, ErrorState, LoadingState } from '@/components/states/states';
import { Badge, InfoBanner } from '@/components/ui/primitives';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceCanonicalKpis } from '@/features/admin/finance/finance-canonical-kpis';
import { ExecutiveFinanceIntelligenceV4Panel } from '@/features/admin/dashboard/executive-finance-intelligence-v4-panel';
import { isFinanceV4CurrentContext } from '@/lib/admin/executive-finance-v4-contract';
import { normalizeExecutiveDashboard } from '@/lib/admin/executive-dashboard-contract';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { parseFinanceCanonicalMetrics } from '@/lib/utils/finance-canonical';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type {
  FinanceCommandCenterAging,
  FinanceCommandCenterAttentionItem,
  FinanceCommandCenterDrilldownTarget,
  FinanceCommandCenterPerformance,
  FinanceCommandCenterPerformanceItem,
  FinanceCommandCenterSummary,
} from '@/types/finance-command-center';
import {
  DEFAULT_COMMAND_CENTER_PERIOD,
  appendAcademicYearToFinancePath,
  isCommandCenterPeriodReady,
  type FinanceCommandCenterPeriodPreset,
  type FinanceCommandCenterPeriodState,
} from './command-center-contract';
import {
  DecisionIntelligenceSheet,
  type FinanceCommandCenterDecisionSelection,
} from './decision-intelligence-sheet';
import { useFinanceCommandCenter } from './use-finance-command-center';
import {
  parseSchoolYearEnrollmentEconomics,
  type FinanceSchoolYearEnrollmentEconomics,
} from './school-year-economics-contract';

const PERIOD_PRESETS: FinanceCommandCenterPeriodPreset[] = [
  'academic_year',
  'this_month',
  'previous_month',
  'month',
  'custom',
];

const ATTENTION_TYPES = new Set([
  'arrears_90_plus',
  'due_next_7_days',
  'payment_promises_open',
  'followups_due_today',
  'followups_overdue',
  'collection_unallocated',
  'incoming_cheques_rejected',
  'finance_data_quality',
]);

function percentage(value: number | null | undefined): React.ReactNode {
  if (value == null || Number.isNaN(value)) return '—';
  return <bdi className="numeric-text" dir="ltr">{value.toFixed(1)}%</bdi>;
}

function availabilityReasonKey(reason?: string | null): string {
  switch (reason) {
    case 'bank_treasury_contract_required':
      return 'admin.finance.commandCenter.reason.bankTreasuryRequired';
    case 'treasury_commitments_contract_required':
      return 'admin.finance.commandCenter.reason.treasuryCommitmentsRequired';
    case 'historical_settlement_attribution_required':
      return 'admin.finance.commandCenter.reason.historicalAttributionRequired';
    default:
      return 'admin.finance.commandCenter.reason.unavailable';
  }
}

function attentionReasonKey(reason?: string | null): string {
  switch (reason) {
    case 'overdue_age_90_plus':
      return 'admin.finance.commandCenter.attentionReason.overdue90';
    case 'installments_due_next_7_days':
      return 'admin.finance.commandCenter.attentionReason.dueNext7';
    case 'payment_promise_open':
      return 'admin.finance.commandCenter.attentionReason.promiseOpen';
    case 'next_followup_today':
      return 'admin.finance.commandCenter.attentionReason.followupToday';
    case 'next_followup_overdue':
      return 'admin.finance.commandCenter.attentionReason.followupOverdue';
    case 'confirmed_collection_unallocated':
      return 'admin.finance.commandCenter.attentionReason.unallocated';
    case 'cheque_rejected':
      return 'admin.finance.commandCenter.attentionReason.chequeRejected';
    case 'historical_settlement_attribution_required':
      return 'admin.finance.commandCenter.reason.historicalAttributionRequired';
    default:
      return 'admin.finance.commandCenter.attentionReason.other';
  }
}

function CommandCenterHeader({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const t = useT();
  return (
    <header className="fcc-hero">
      <div className="fcc-hero__copy">
        <Link href="/admin/finance" className="fcc-hero__eyebrow">
          {t('admin.finance.commandCenter.backToFinance')}
        </Link>
        <h1>{t('admin.finance.commandCenter.title')}</h1>
      </div>
      <button
        type="button"
        className="btn btn--ghost btn--sm fcc-hero__refresh"
        onClick={onRefresh}
        disabled={refreshing}
      >
        {refreshing
          ? t('admin.finance.commandCenter.refreshing')
          : t('admin.finance.commandCenter.refresh')}
      </button>
    </header>
  );
}

function ContextBar({
  period,
  onPeriodChange,
}: {
  period: FinanceCommandCenterPeriodState;
  onPeriodChange: (next: FinanceCommandCenterPeriodState) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  return (
    <section className="card fcc-context" aria-label={t('admin.finance.commandCenter.analysisPeriod')}>
      <div className="fcc-period">
        <strong>{t('admin.finance.commandCenter.analysisPeriod')}</strong>
        <div className="fcc-period__presets">
          {PERIOD_PRESETS.map((preset) => (
            <button key={preset} type="button"
              className={`btn btn--sm ${period.preset === preset ? 'btn--primary' : 'btn--ghost'}`}
              aria-pressed={period.preset === preset}
              onClick={() => onPeriodChange(preset === 'month'
                ? { preset, dateFrom: period.dateFrom ? `${period.dateFrom.slice(0, 7)}-01` : '', dateTo: '' }
                : { ...period, preset })}>
              {t(`admin.finance.commandCenter.period.${preset}`)}
            </button>
          ))}
        </div>
        {period.preset === 'month' ? (
          <label className="fcc-period__month">
            <span>{t('admin.finance.commandCenter.selectMonth')}</span>
            <input type="month" lang={locale === 'ar' ? 'ar-MA' : locale}
              value={period.dateFrom.slice(0, 7)}
              onChange={(event) => onPeriodChange({
                ...period, dateFrom: event.target.value ? `${event.target.value}-01` : '', dateTo: '',
              })}/>
          </label>
        ) : null}
        {period.preset === 'custom' ? (
          <div className="fcc-period__custom">
            <label><span>{t('admin.finance.commandCenter.dateFrom')}</span>
              <DatePickerInput value={period.dateFrom} onChange={(dateFrom) => onPeriodChange({ ...period, dateFrom })} presets={false}/></label>
            <label><span>{t('admin.finance.commandCenter.dateTo')}</span>
              <DatePickerInput value={period.dateTo} onChange={(dateTo) => onPeriodChange({ ...period, dateTo })} presets={false}/></label>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
  onOpen,
  tone,
  compact = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  onOpen?: (() => void) | null;
  tone?: 'default' | 'danger' | 'success' | 'warning';
  compact?: boolean;
}) {
  const body = (
    <>
      <span className="fcc-kpi__label">{label}</span>
      <strong className="fcc-kpi__value">{value}</strong>
      {hint ? <span className="fcc-kpi__hint">{hint}</span> : null}
    </>
  );
  const className = `card fcc-kpi fcc-kpi--${tone ?? 'default'}${compact ? ' fcc-kpi--compact' : ''}`;
  return onOpen ? (
    <button type="button" className={`${className} fcc-kpi--interactive`} onClick={onOpen}>
      {body}
    </button>
  ) : (
    <article className={className}>{body}</article>
  );
}

function SummarySection({
  summary,
  onOpenDecision,
}: {
  summary: FinanceCommandCenterSummary;
  onOpenDecision: (label: string, target: FinanceCommandCenterDrilldownTarget) => void;
}) {
  const t = useT();
  const currency = summary.meta.currency?.name;
  const due = summary.kpis.due_to_date;
  const collected = summary.kpis.recognized_collected_to_date;
  const rate = summary.kpis.collection_rate_to_date;
  const overdue = summary.kpis.overdue;
  const canonical = parseFinanceCanonicalMetrics(summary.canonical_metrics, {
    schoolId: summary.meta.school_id,
    academicYearId: summary.meta.academic_year_id,
  });

  return (
    <>
      {summary.data_quality?.historical_settlement_attribution_complete === false ? (
        <InfoBanner
          tone="amber"
          title={t('admin.finance.commandCenter.dataQualityTitle')}
          description={t('admin.finance.commandCenter.dataQualityHistorical')}
        />
      ) : null}

      <section className="fcc-section">
        <div className="fcc-section__head">
          <div>
            <h2>{t('admin.finance.commandCenter.positionTitle')}</h2>
          </div>
        </div>
        <div className="fcc-kpi-grid">
          <MetricCard
            label={t('admin.finance.commandCenter.kpi.due')}
            value={<FinanceMoney amount={due.amount} currency={currency} />}
            hint={t('admin.finance.commandCenter.installmentsCount', { count: String(due.installments_count) })}
            onOpen={due.drilldown ? () => onOpenDecision(t('admin.finance.commandCenter.kpi.due'), due.drilldown!) : null}
          />
          <MetricCard
            label={t('admin.finance.commandCenter.kpi.collected')}
            value={
              collected.available
                ? <FinanceMoney amount={collected.amount} currency={currency} />
                : t('admin.finance.commandCenter.unavailable')
            }
            hint={
              collected.available
                ? t('admin.finance.commandCenter.recognizedBasis')
                : t(availabilityReasonKey(collected.reason_code))
            }
            onOpen={collected.available && collected.drilldown
              ? () => onOpenDecision(t('admin.finance.commandCenter.kpi.collected'), collected.drilldown!)
              : null}
            tone="success"
          />
          <MetricCard
            label={t('admin.finance.commandCenter.kpi.collectionRate')}
            value={rate.available ? percentage(rate.value) : t('admin.finance.commandCenter.unavailable')}
            hint={rate.available ? t('admin.finance.commandCenter.sameDueCohort') : t(availabilityReasonKey(rate.reason_code))}
            onOpen={rate.available && rate.drilldown
              ? () => onOpenDecision(t('admin.finance.commandCenter.kpi.collectionRate'), rate.drilldown!)
              : null}
            tone="default"
          />
          <MetricCard
            label={t('admin.finance.commandCenter.kpi.overdue')}
            value={
              overdue.available
                ? <FinanceMoney amount={overdue.amount} currency={currency} />
                : t('admin.finance.commandCenter.unavailable')
            }
            hint={
              overdue.available
                ? t('admin.finance.commandCenter.overdueAccounts', {
                    accounts: String(overdue.billing_accounts_count),
                    installments: String(overdue.installments_count),
                  })
                : t(availabilityReasonKey(overdue.reason_code))
            }
            onOpen={overdue.available && overdue.drilldown
              ? () => onOpenDecision(t('admin.finance.commandCenter.kpi.overdue'), overdue.drilldown!)
              : null}
            tone="danger"
          />
        </div>

      </section>
      {canonical ? (
        <FinanceCanonicalKpis
          metrics={canonical}
          keys={['academic_year_programmed_total', 'future_scheduled_amount', 'remaining_due_to_date']}
        />
      ) : null}
    </>
  );
}

function EnrollmentEconomicsSection({
  data, hasResponse, loading, error, reload,
}: {
  data: FinanceSchoolYearEnrollmentEconomics | null;
  hasResponse: boolean;
  loading: boolean;
  error: Parameters<typeof ApiErrorView>[0]['error'] | null;
  reload: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const heading = <div className="fcc-section__head"><div>
    <h2>{t('admin.finance.economics.title')}</h2>
    <p>{t('admin.finance.economics.description')}</p>
  </div></div>;
  if (loading && !hasResponse) return <section className="fcc-section fcc-economics" aria-busy="true">
    {heading}
    <div className="fcc-kpi-grid fcc-economics__grid">{Array.from({ length: 5 }).map((_, i) =>
      <div key={i} className="card fcc-kpi fcc-skeleton" />)}</div>
  </section>;
  if (error) return <section className="fcc-section fcc-economics">
    {heading}<ApiErrorView error={error} onRetry={reload} />
  </section>;
  if (!data) return <section className="fcc-section fcc-economics">
    {heading}
    {hasResponse
      ? <InfoBanner tone="amber" title={t('admin.finance.economics.unavailable')}
          description={t('admin.finance.economics.contextMismatch')} />
      : <EmptyState compact description={t('admin.finance.economics.unavailable')} />}
  </section>;
  const language = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US', es: 'es-ES' }[locale];
  const students = new Intl.NumberFormat(language).format(data.current_students_count);
  return <section className="fcc-section fcc-economics" aria-label={t('admin.finance.economics.title')}>
    {heading}
    <div className="fcc-kpi-grid fcc-economics__grid">
      <MetricCard label={t('admin.finance.economics.students')}
        value={<bdi dir="ltr" className="numeric-text">{students}</bdi>} />
      <MetricCard label={t('admin.finance.economics.registration')}
        value={<FinanceMoney amount={data.registration_net} currency={data.currency} />} />
      <MetricCard label={t('admin.finance.economics.tuition')}
        value={<FinanceMoney amount={data.tuition_net} currency={data.currency} />} />
      <MetricCard label={t('admin.finance.economics.total')}
        value={<FinanceMoney amount={data.combined_net} currency={data.currency} />} tone="success" />
      <MetricCard label={t('admin.finance.economics.average')}
        value={data.average_per_current_student === null
          ? t('admin.finance.economics.unavailable')
          : <FinanceMoney amount={data.average_per_current_student} currency={data.currency} />} />
    </div>
    <div className="fcc-economics__footer">
      <span>{t('admin.finance.economics.note')}</span>
      <span>{t('admin.finance.economics.asOf')}: <bdi dir="ltr">{data.as_of_date}</bdi></span>
    </div>
  </section>;
}

function periodLabel(period: string, locale: string): string {
  if (!/^\d{4}-\d{2}$/.test(period)) return period;
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  const localeMap: Record<string, string> = {
    ar: 'ar-MA',
    fr: 'fr-FR',
    en: 'en-US',
    es: 'es-ES',
  };
  return new Intl.DateTimeFormat(localeMap[locale] ?? 'fr-FR', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}



function ComparisonMonthCard({
  item,
  period,
  roleLabel,
  currency,
  locale,
}: {
  item: FinanceCommandCenterPerformanceItem | undefined;
  period: string;
  roleLabel: string;
  currency?: string;
  locale: string;
}) {
  const t = useT();
  const money = (amount: number | null | undefined) => (
    amount == null
      ? <span className="muted">{t('common.dash')}</span>
      : <FinanceMoney amount={amount} currency={currency} />
  );
  return (
    <article className="fcc-month-comparison__card">
      <span className="fcc-month-comparison__period-role">{roleLabel}</span>
      <strong>{periodLabel(period, locale)}</strong>
      <dl>
        <div><dt>{t('admin.finance.commandCenter.due')}</dt><dd>{money(item?.due_amount)}</dd></div>
        <div><dt>{t('admin.finance.commandCenter.collected')}</dt><dd>{money(item?.recognized_collected_amount)}</dd></div>
        <div><dt>{t('admin.finance.commandCenter.collectionRate')}</dt><dd>{percentage(item?.collection_rate)}</dd></div>
        <div><dt>{t('admin.finance.commandCenter.remaining')}</dt><dd>{money(item?.remaining_amount)}</dd></div>
      </dl>
    </article>
  );
}

function MonthComparison({ data, period }: { data: FinanceCommandCenterPerformance; period: FinanceCommandCenterPeriodState }) {
  const t = useT();
  const { locale } = useLocale();
  if (period.preset !== 'academic_year') return null;
  const elapsed = data.items.filter((item) => item.period < data.meta.as_of_date.slice(0, 7));
  if (elapsed.length < 2) return null;
  const previousItem = elapsed[elapsed.length - 2];
  const currentItem = elapsed[elapsed.length - 1];
  const currency = data.meta.currency?.name;
  const previousRate = previousItem.collection_rate;
  const currentRate = currentItem.collection_rate;
  // Historical comparisons require complete settlement attribution on both months.
  const rateDelta = data.data_quality?.historical_settlement_attribution_complete !== false
    && previousRate != null && currentRate != null
    && Number.isFinite(previousRate) && Number.isFinite(currentRate)
    ? currentRate - previousRate : null;
  const trendCopy = {
    ar: { up: 'تحسن', down: 'تراجع', flat: 'استقرار', unit: 'نقطة مئوية', note: 'مقارنة تحصيل مستحقات شهرين مكتملين، وليست مقارنة إجمالي النقد المحصل.' },
    fr: { up: 'Amélioration', down: 'Baisse', flat: 'Stabilité', unit: 'points', note: 'Comparaison du recouvrement des échéances, pas du total des encaissements.' },
    en: { up: 'Improvement', down: 'Decline', flat: 'No change', unit: 'percentage points', note: 'Compares due-cohort collection rates, not total cash receipts.' },
    es: { up: 'Mejora', down: 'Descenso', flat: 'Sin cambios', unit: 'puntos porcentuales', note: 'Compara el cobro de vencimientos, no los cobros de caja totales.' },
  }[locale];
  return (
    <section className="fcc-month-comparison" aria-label={t('admin.finance.commandCenter.decision.compareTwoMonths')}>
      <div className="fcc-month-comparison__head"><strong>{t('admin.finance.commandCenter.decision.comparison')}</strong></div>
      <div className="fcc-month-comparison__grid">
        <ComparisonMonthCard item={previousItem} period={previousItem.period} roleLabel={t('admin.finance.commandCenter.decision.firstMonth')} currency={currency} locale={locale} />
        <ComparisonMonthCard item={currentItem} period={currentItem.period} roleLabel={t('admin.finance.commandCenter.decision.secondMonth')} currency={currency} locale={locale} />
      </div>
      {rateDelta !== null ? (
        <p role="status" className="muted">
          {trendCopy[rateDelta > 0 ? 'up' : rateDelta < 0 ? 'down' : 'flat']}:
          {' '}{Math.abs(rateDelta).toFixed(1)} {trendCopy.unit}.
          {' '}{trendCopy.note}
        </p>
      ) : null}
    </section>
  );
}

function PerformanceSection({
  period,
  data,
  loading,
  error,
  reload,
  periodReady,
  onOpenDecision,
}: {
  period: FinanceCommandCenterPeriodState;
  data: FinanceCommandCenterPerformance | null;
  loading: boolean;
  error: Parameters<typeof ApiErrorView>[0]['error'] | null;
  reload: () => void;
  periodReady: boolean;
  onOpenDecision: (label: string, target: FinanceCommandCenterDrilldownTarget) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  if (!periodReady) {
    return (
      <section className="fcc-section">
        <div className="fcc-section__head"><div><h2>{t('admin.finance.commandCenter.performanceTitle')}</h2></div></div>
        <EmptyState compact title={t('admin.finance.commandCenter.customPeriodIncompleteTitle')} description={t('admin.finance.commandCenter.customPeriodIncompleteDesc')} />
      </section>
    );
  }
  if (loading && !data) return <LoadingState label={t('admin.finance.commandCenter.loadingPerformance')} />;
  if (error) return <ApiErrorView error={error} onRetry={reload} />;
  if (!data?.items?.length) {
    return (
      <section className="fcc-section">
        <div className="fcc-section__head"><div><h2>{t('admin.finance.commandCenter.performanceTitle')}</h2></div></div>
        <EmptyState compact description={t('admin.finance.commandCenter.performanceEmpty')} />
      </section>
    );
  }

  const max = Math.max(1, ...data.items.flatMap((item) => [item.due_amount ?? 0, item.recognized_collected_amount ?? 0]));
  const currency = data.meta.currency?.name;
  const complete = data.data_quality?.historical_settlement_attribution_complete !== false;

  return (
    <section className="fcc-section">
      <div className="fcc-section__head">
        <div><h2>{t('admin.finance.commandCenter.performanceTitle')}</h2></div>
        <div className="fcc-legend" aria-label={t('admin.finance.commandCenter.legend')}>
          <span><i className="fcc-legend__dot fcc-legend__dot--due" />{t('admin.finance.commandCenter.due')}</span>
          <span><i className="fcc-legend__dot fcc-legend__dot--collected" />{t('admin.finance.commandCenter.collected')}</span>
          <span className="fcc-legend__future">{t('admin.finance.commandCenter.paidInAdvance')}</span>
        </div>
      </div>

      {!complete ? <InfoBanner tone="amber" title={t('admin.finance.commandCenter.dataQualityTitle')} description={t('admin.finance.commandCenter.performanceHistoricalUnavailable')} /> : null}

      <div className="card fcc-performance">
        <div className="fcc-performance__chart">
          {data.items.map((item) => (
            <button
              type="button"
              className={`fcc-performance__month fcc-performance__month--interactive ${item.period > data.meta.as_of_date.slice(0, 7) ? "fcc-performance__month--future" : ""}`}
              key={item.period}
              disabled={!item.drilldown}
              onClick={() => item.drilldown && onOpenDecision(periodLabel(item.period, locale), item.drilldown)}
            >
              <span className="fcc-performance__bars" aria-label={periodLabel(item.period, locale)}>
                <span className="fcc-performance__bar fcc-performance__bar--due" style={{ height: `${((item.due_amount ?? 0) / max) * 100}%` }} title={String(item.due_amount ?? 0)} />
                {item.recognized_collected_amount != null ? (
                  <span className="fcc-performance__bar fcc-performance__bar--collected" style={{ height: `${(item.recognized_collected_amount / max) * 100}%` }} title={String(item.recognized_collected_amount)} />
                ) : null}
              </span>
              <span>{periodLabel(item.period, locale)}</span>
              <strong>{item.period > data.meta.as_of_date.slice(0, 7) ? null : item.due_amount === 0 || item.collection_rate == null ? '—' : `${item.collection_rate.toFixed(1)}%`}</strong>
            </button>
          ))}
        </div>

        <MonthComparison data={data} period={period} />
        <details className="fcc-performance__basis-help">
          <summary aria-label={t('admin.finance.commandCenter.performanceBasisHelp')} title={t('admin.finance.commandCenter.performanceBasisHelp')}>ⓘ</summary>
          <p>{t('admin.finance.commandCenter.performanceBasis')}</p>
        </details>

        {period.preset === 'academic_year' && data.non_periodic_charges ? (
          <section className="fcc-non-periodic" aria-label={t('admin.finance.commandCenter.nonPeriodic.title')}>
            <div className="fcc-non-periodic__heading">
              <h3>{t('admin.finance.commandCenter.nonPeriodic.title')}</h3>
              <details className="fcc-non-periodic__help">
                <summary>{t('admin.finance.commandCenter.nonPeriodic.helpLabel')}</summary>
                <p>{t('admin.finance.commandCenter.nonPeriodic.description')}</p>
              </details>
            </div>
            <dl>
              <div><dt>{t('admin.finance.commandCenter.nonPeriodic.total')}</dt><dd><FinanceMoney amount={data.non_periodic_charges.due_amount} currency={currency} /></dd></div>
              <div><dt>{t('admin.finance.commandCenter.nonPeriodic.paid')}</dt><dd>{complete ? <FinanceMoney amount={data.non_periodic_charges.collected_amount} currency={currency} /> : t('admin.finance.commandCenter.unavailable')}</dd></div>
              <div><dt>{t('admin.finance.commandCenter.nonPeriodic.remaining')}</dt><dd>{complete ? <FinanceMoney amount={data.non_periodic_charges.remaining_amount} currency={currency} /> : t('admin.finance.commandCenter.unavailable')}</dd></div>
              <div><dt>{t('admin.finance.commandCenter.nonPeriodic.count')}</dt><dd><bdi dir="ltr">{data.non_periodic_charges.count}</bdi></dd></div>
            </dl>
          </section>
        ) : null}
        <details className="fcc-performance__details">
          <summary className="fcc-performance__details-toggle">
            <span className="fcc-performance__details-closed">{t('admin.finance.commandCenter.showDetails')}</span>
            <span className="fcc-performance__details-open">{t('admin.finance.commandCenter.hideDetails')}</span>
          </summary>
          <div className="fcc-table-wrap">
            <table className="fcc-table">
              <thead><tr><th>{t('admin.finance.commandCenter.periodColumn')}</th><th>{t('admin.finance.commandCenter.due')}</th><th>{t('admin.finance.commandCenter.collected')}</th><th>{t('admin.finance.commandCenter.collectionRate')}</th><th>{t('admin.finance.commandCenter.remaining')}</th></tr></thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.period}>
                    <td>{periodLabel(item.period, locale)}</td>
                    <td><FinanceMoney amount={item.due_amount} currency={currency} /></td>
                    <td>{item.recognized_collected_amount == null ? <span className="muted">—</span> : <FinanceMoney amount={item.recognized_collected_amount} currency={currency} />}</td>
                    <td>{percentage(item.collection_rate)}</td>
                    <td>{item.remaining_amount == null ? <span className="muted">—</span> : <FinanceMoney amount={item.remaining_amount} currency={currency} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}

function AgingSection({ data, loading, error, reload, onOpenDecision }: {
  data: FinanceCommandCenterAging | null;
  loading: boolean;
  error: Parameters<typeof ApiErrorView>[0]['error'] | null;
  reload: () => void;
  onOpenDecision: (label: string, target: FinanceCommandCenterDrilldownTarget) => void;
}) {
  const t = useT();
  if (loading && !data) return <LoadingState label={t('admin.finance.commandCenter.loadingAging')} />;
  if (error) return <ApiErrorView error={error} onRetry={reload} />;
  if (!data) return null;

  if (!data.summary.available) {
    return (
      <section className="fcc-section">
        <div className="fcc-section__head"><div><h2>{t('admin.finance.commandCenter.agingTitle')}</h2></div></div>
        <InfoBanner tone="amber" title={t('admin.finance.commandCenter.agingUnavailableTitle')} description={t(availabilityReasonKey(data.summary.reason_code))} />
      </section>
    );
  }

  const currency = data.meta.currency?.name;
  const current = data.items.find((item) => item.key === 'current');
  const overdueItems = data.items.filter((item) => item.key !== 'current');

  return (
    <section className="fcc-section">
      <div className="fcc-section__head">
        <div><h2>{t('admin.finance.commandCenter.agingTitle')}</h2></div>
        <div className="fcc-section__summary"><span>{t('admin.finance.commandCenter.outstanding')}</span><FinanceMoney amount={data.summary.outstanding_amount} currency={currency} /></div>
      </div>
      <div className="card fcc-aging">
        {current ? (
          <button type="button" className="fcc-aging__current fcc-aging__row--interactive"
            disabled={!current.drilldown}
            onClick={() => current.drilldown && onOpenDecision(t('admin.finance.commandCenter.aging.current'), current.drilldown)}>
            <span className="fcc-aging__label">
              <strong>{t('admin.finance.commandCenter.aging.current')}</strong>
              <span>{t('admin.finance.commandCenter.installmentsCount', { count: String(current.installments_count) })}</span>
            </span>
            <span className="fcc-aging__value"><FinanceMoney amount={current.amount} currency={currency} /></span>
          </button>
        ) : null}
        {overdueItems.length > 0 ? (
          <div className="fcc-aging__overdue">
            <h3>{t('admin.finance.commandCenter.overdueBreakdown')}</h3>
            {overdueItems.map((item) => (
              <button type="button" className="fcc-aging__row fcc-aging__row--interactive" key={item.key}
                disabled={!item.drilldown}
                onClick={() => item.drilldown && onOpenDecision(t(`admin.finance.commandCenter.aging.${item.key}`), item.drilldown)}>
                <span className="fcc-aging__label">
                  <strong>{t(`admin.finance.commandCenter.aging.${item.key}`)}</strong>
                  <span>{t('admin.finance.commandCenter.installmentsCount', { count: String(item.installments_count) })}</span>
                </span>
                <span className="fcc-aging__track" aria-hidden="true">
                  <span style={{ width: `${item.percentage_of_overdue == null ? 0 : Math.min(100, Math.max(0, item.percentage_of_overdue))}%` }} />
                </span>
                <span className="fcc-aging__value">
                  <FinanceMoney amount={item.amount} currency={currency} />
                  {item.percentage_of_overdue != null ? <small><bdi dir="ltr">{item.percentage_of_overdue.toFixed(1)}%</bdi> {t('admin.finance.commandCenter.shareOfOverdue')}</small> : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function attentionTitle(item: FinanceCommandCenterAttentionItem, t: ReturnType<typeof useT>): string {
  const key = ATTENTION_TYPES.has(item.type) ? item.type : 'other';
  return t(`admin.finance.commandCenter.attention.${key}`);
}

function AttentionSection({ data, loading, error, reload, onOpenDecision }: {
  data: { meta: FinanceCommandCenterSummary['meta']; items: FinanceCommandCenterAttentionItem[] } | null;
  loading: boolean;
  error: Parameters<typeof ApiErrorView>[0]['error'] | null;
  reload: () => void;
  onOpenDecision: (label: string, target: FinanceCommandCenterDrilldownTarget) => void;
}) {
  const t = useT();
  if (loading && !data) return <LoadingState label={t('admin.finance.commandCenter.loadingAttention')} />;
  if (error) return <ApiErrorView error={error} onRetry={reload} />;
  if (!data) return null;

  const visible = data.items.filter((item) => item.type === 'finance_data_quality' || (item.count ?? 0) > 0 || (item.amount ?? 0) > 0);
  const currency = data.meta.currency?.name;

  return (
    <section className="fcc-section">
      <div className="fcc-section__head"><div><h2>{t('admin.finance.commandCenter.attentionTitle')}</h2></div></div>
      {!visible.length ? (
        <div className="card fcc-attention-empty"><strong>{t('admin.finance.commandCenter.attentionClearTitle')}</strong><span>{t('admin.finance.commandCenter.attentionClearDesc')}</span></div>
      ) : (
        <div className="fcc-attention-grid">
          {visible.map((item, index) => {
            const href = appendAcademicYearToFinancePath(item.action_path, data.meta.academic_year_id);
            const tone = item.severity === 'high' ? 'red' : item.severity === 'medium' ? 'amber' : 'blue';
            const title = attentionTitle(item, t);
            return (
              <article className={`card fcc-attention fcc-attention--${item.severity}`} key={`${item.type}-${index}`}>
                <div className="fcc-attention__head">
                  <Badge tone={tone}>{t(`admin.finance.commandCenter.severity.${item.severity === 'high' || item.severity === 'medium' ? item.severity : 'info'}`)}</Badge>
                  {item.count != null ? (
                    <strong className="fcc-attention__count">
                      {item.type === 'arrears_90_plus' ? (
                        <>{t('admin.finance.commandCenter.arrearsAccountsCountLabel')} <bdi dir="ltr">{item.count}</bdi></>
                      ) : (
                        <><bdi dir="ltr">{item.count}</bdi> {t(`admin.finance.commandCenter.attentionUnit.${ATTENTION_TYPES.has(item.type) ? item.type : 'other'}`)}</>
                      )}
                    </strong>
                  ) : null}
                </div>
                <h3>{title}</h3>
                <p>{t(attentionReasonKey(item.reason_code))}</p>
                {item.amount != null ? <FinanceMoney amount={item.amount} currency={currency} /> : null}
                {item.drilldown ? (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => onOpenDecision(title, item.drilldown!)}>
                    {t('admin.finance.commandCenter.decision.explainTitle')}
                  </button>
                ) : href ? (
                  <Link href={href} className="btn btn--ghost btn--sm">{t('admin.finance.commandCenter.openAction')}</Link>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function FinanceCommandCenterPage() {
  const t = useT();
  const { locale } = useLocale();
  const { activeSchoolId, activeAcademicYearId, academicYearLoading, academicYearError } = useAdminSession();
  const executiveQuery = useMemo(
    () => activeAcademicYearId ? { academic_year_id: activeAcademicYearId } : undefined,
    [activeAcademicYearId],
  );
  const financeV4State = useAdminResource<unknown>(
    activeSchoolId && activeAcademicYearId ? endpoints.admin.executiveDashboard : null,
    executiveQuery,
    { keepPreviousData: false },
  );
  const financeV4 = useMemo(() => {
    if (financeV4State.data == null || !activeSchoolId || !activeAcademicYearId) return null;
    const dashboard = normalizeExecutiveDashboard(financeV4State.data, locale);
    const metric = dashboard.finance_intelligence_v4;
    return metric && isFinanceV4CurrentContext(metric, activeSchoolId, activeAcademicYearId)
      ? metric : null;
  }, [financeV4State.data, activeSchoolId, activeAcademicYearId, locale]);
  const [period, setPeriod] = useState<FinanceCommandCenterPeriodState>(DEFAULT_COMMAND_CENTER_PERIOD);
  const [decision, setDecision] = useState<FinanceCommandCenterDecisionSelection | null>(null);
  const commandCenter = useFinanceCommandCenter(period);
  const summary = commandCenter.summary.data;

  const periodReady = useMemo(
    () => isCommandCenterPeriodReady(period, summary?.meta.as_of_date),
    [period, summary?.meta.as_of_date],
  );

  const openDecision = (label: string, target: FinanceCommandCenterDrilldownTarget) => {
    setDecision({ label, target });
  };

  if (academicYearLoading && activeAcademicYearId == null) {
    return <LoadingState label={t('admin.finance.commandCenter.loadingContext')} />;
  }

  if (academicYearError) {
    return <ErrorState error={{ code: academicYearError.code, message: academicYearError.message, details: {} }} />;
  }

  if (activeAcademicYearId == null) {
    return <EmptyState title={t('admin.finance.commandCenter.yearRequiredTitle')} description={t('admin.finance.commandCenter.yearRequiredDesc')} />;
  }

  return (
    <div className="admin-workspace finance-command-center">
      <CommandCenterHeader
        refreshing={commandCenter.refreshing || financeV4State.fetching}
        onRefresh={() => { commandCenter.refresh(); financeV4State.reload(); }}
      />

      {commandCenter.summary.initialLoading ? (
        <div className="fcc-kpi-grid" aria-busy="true">{Array.from({ length: 4 }).map((_, index) => <div className="card fcc-kpi fcc-skeleton" key={index} />)}</div>
      ) : commandCenter.summary.error ? (
        <ApiErrorView error={commandCenter.summary.error} onRetry={commandCenter.summary.reload} />
      ) : summary ? (
        <SummarySection summary={summary} onOpenDecision={openDecision} />
      ) : null}

      {activeSchoolId != null && activeAcademicYearId != null ? (
        <EnrollmentEconomicsSection
          key={`${activeSchoolId}:${activeAcademicYearId}`}
          data={parseSchoolYearEnrollmentEconomics(commandCenter.economics.data, activeAcademicYearId)}
          hasResponse={commandCenter.economics.data != null}
          loading={commandCenter.economics.initialLoading}
          error={commandCenter.economics.error}
          reload={commandCenter.economics.reload}
        />
      ) : null}

      <ContextBar period={period} onPeriodChange={setPeriod} />
      {financeV4 ? (
        <section aria-label={locale === 'ar' ? 'الالتزام التعاقدي للشهر الجاري' : locale === 'fr' ? 'Engagement du mois en cours' : locale === 'es' ? 'Compromiso del mes actual' : 'Current-month contractual commitment'}>
          <ExecutiveFinanceIntelligenceV4Panel data={financeV4} locale={locale} />
          <p className="muted">
            {locale === 'ar'
              ? 'مؤشر الشهر الجاري فقط؛ لا يمثل قيمة تاريخية للشهر المختار، ولا تحصيلات نقدية أو أرباحًا.'
              : locale === 'fr'
                ? 'Indicateur du mois en cours uniquement, pas une valeur historique du mois sélectionné ni des encaissements ou bénéfices.'
                : locale === 'es'
                  ? 'Indicador solo del mes actual; no representa el mes histórico seleccionado, cobros ni beneficios.'
                  : 'Current-month metric only; not a historical value for the selected month, cash receipts, or profit.'}
          </p>
        </section>
      ) : null}
      <PerformanceSection
        period={period}
        data={commandCenter.performance.data}
        loading={commandCenter.performance.initialLoading}
        error={commandCenter.performance.error}
        reload={commandCenter.performance.reload}
        periodReady={periodReady}
        onOpenDecision={openDecision}
      />

      <div className="fcc-decision-grid">
        <AgingSection
          data={commandCenter.aging.data}
          loading={commandCenter.aging.initialLoading}
          error={commandCenter.aging.error}
          reload={commandCenter.aging.reload}
          onOpenDecision={openDecision}
        />
        <AttentionSection
          data={commandCenter.attention.data}
          loading={commandCenter.attention.initialLoading}
          error={commandCenter.attention.error}
          reload={commandCenter.attention.reload}
          onOpenDecision={openDecision}
        />
      </div>

      <DecisionIntelligenceSheet selection={decision} onClose={() => setDecision(null)} />
    </div>
  );
}
