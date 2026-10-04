'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ApiErrorView, EmptyState, ErrorState, LoadingState } from '@/components/states/states';
import { Badge, InfoBanner } from '@/components/ui/primitives';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
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

const PERIOD_PRESETS: FinanceCommandCenterPeriodPreset[] = [
  'academic_year',
  'this_month',
  'previous_month',
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
        <p>{t('admin.finance.commandCenter.subtitle')}</p>
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
  summary,
}: {
  period: FinanceCommandCenterPeriodState;
  onPeriodChange: (next: FinanceCommandCenterPeriodState) => void;
  summary: FinanceCommandCenterSummary | null;
}) {
  const t = useT();
  const { formatDate, formatDateTime } = useFormat();
  const asOfDate = summary?.meta.as_of_date;
  const generatedAt = summary?.meta.generated_at;

  return (
    <section className="card fcc-context" aria-label={t('admin.finance.commandCenter.contextTitle')}>
      <div className="fcc-context__identity">
        <div className="fcc-context__fact">
          <span>{t('admin.finance.commandCenter.asOf')}</span>
          <strong><bdi dir="ltr">{asOfDate ? formatDate(asOfDate) : t('common.dash')}</bdi></strong>
        </div>
        <div className="fcc-context__fact">
          <span>{t('admin.finance.commandCenter.lastUpdated')}</span>
          <strong><bdi dir="ltr">{generatedAt ? formatDateTime(generatedAt) : t('common.dash')}</bdi></strong>
        </div>
      </div>

      <div className="fcc-period">
        <div className="fcc-period__head">
          <strong>{t('admin.finance.commandCenter.analysisPeriod')}</strong>
          <span>{t('admin.finance.commandCenter.periodScopeNote')}</span>
        </div>
        <div className="fcc-period__presets">
          {PERIOD_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`btn btn--sm ${period.preset === preset ? 'btn--primary' : 'btn--ghost'}`}
              aria-pressed={period.preset === preset}
              onClick={() => onPeriodChange({ ...period, preset })}
            >
              {t(`admin.finance.commandCenter.period.${preset}`)}
            </button>
          ))}
        </div>
        {period.preset === 'custom' ? (
          <div className="fcc-period__custom">
            <label>
              <span>{t('admin.finance.commandCenter.dateFrom')}</span>
              <DatePickerInput
                value={period.dateFrom}
                onChange={(dateFrom) => onPeriodChange({ ...period, dateFrom })}
                presets={false}
              />
            </label>
            <label>
              <span>{t('admin.finance.commandCenter.dateTo')}</span>
              <DatePickerInput
                value={period.dateTo}
                onChange={(dateTo) => onPeriodChange({ ...period, dateTo })}
                presets={false}
              />
            </label>
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
  const forecast = summary.unavailable_metrics.expected_liquidity_30d;

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
            <p>{t('admin.finance.commandCenter.positionSubtitle')}</p>
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
            tone="success"
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

        <div className="fcc-treasury-grid">
          <MetricCard
            label={t('admin.finance.commandCenter.kpi.expectedLiquidity30')}
            value={forecast.available ? t('common.dash') : t('admin.finance.commandCenter.unavailable')}
            hint={t(availabilityReasonKey(forecast.reason_code))}
            tone="warning"
            compact
          />
        </div>
      </section>
    </>
  );
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
  currency,
  locale,
}: {
  item: FinanceCommandCenterPerformanceItem;
  currency?: string;
  locale: string;
}) {
  const t = useT();
  return (
    <article className="fcc-month-comparison__card">
      <strong>{periodLabel(item.period, locale)}</strong>
      <dl>
        <div><dt>{t('admin.finance.commandCenter.due')}</dt><dd><FinanceMoney amount={item.due_amount} currency={currency} /></dd></div>
        <div><dt>{t('admin.finance.commandCenter.collected')}</dt><dd><FinanceMoney amount={item.recognized_collected_amount} currency={currency} /></dd></div>
        <div><dt>{t('admin.finance.commandCenter.collectionRate')}</dt><dd>{percentage(item.collection_rate)}</dd></div>
        <div><dt>{t('admin.finance.commandCenter.remaining')}</dt><dd><FinanceMoney amount={item.remaining_amount} currency={currency} /></dd></div>
      </dl>
    </article>
  );
}

function MonthComparison({ data }: { data: FinanceCommandCenterPerformance }) {
  const t = useT();
  const { locale } = useLocale();
  const periods = data.items.map((item) => item.period);
  const periodKey = periods.join('|');
  const [monthA, setMonthA] = useState(periods.at(-2) ?? periods[0] ?? '');
  const [monthB, setMonthB] = useState(periods.at(-1) ?? periods[0] ?? '');

  useEffect(() => {
    if (!periods.length) return;
    if (!periods.includes(monthA)) setMonthA(periods.at(-2) ?? periods[0]);
    if (!periods.includes(monthB)) setMonthB(periods.at(-1) ?? periods[0]);
  }, [monthA, monthB, periodKey]);

  if (data.items.length < 2) return null;
  const left = data.items.find((item) => item.period === monthA) ?? data.items[0];
  const right = data.items.find((item) => item.period === monthB) ?? data.items[1];
  const currency = data.meta.currency?.name;

  return (
    <section className="fcc-month-comparison" aria-label={t('admin.finance.commandCenter.decision.compareTwoMonths')}>
      <div className="fcc-month-comparison__head">
        <div>
          <strong>{t('admin.finance.commandCenter.decision.comparison')}</strong>
          <span>{t('admin.finance.commandCenter.decision.dueCohortComparison')}</span>
        </div>
        <div className="fcc-month-comparison__selectors">
          <label>
            <span>{t('admin.finance.commandCenter.decision.firstMonth')}</span>
            <select value={monthA} onChange={(event) => setMonthA(event.target.value)}>
              {data.items.map((item) => <option value={item.period} key={`a-${item.period}`}>{periodLabel(item.period, locale)}</option>)}
            </select>
          </label>
          <label>
            <span>{t('admin.finance.commandCenter.decision.secondMonth')}</span>
            <select value={monthB} onChange={(event) => setMonthB(event.target.value)}>
              {data.items.map((item) => <option value={item.period} key={`b-${item.period}`}>{periodLabel(item.period, locale)}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="fcc-month-comparison__grid">
        <ComparisonMonthCard item={left} currency={currency} locale={locale} />
        <ComparisonMonthCard item={right} currency={currency} locale={locale} />
      </div>
    </section>
  );
}

function PerformanceSection({
  data,
  loading,
  error,
  reload,
  periodReady,
  onOpenDecision,
}: {
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
        <div><h2>{t('admin.finance.commandCenter.performanceTitle')}</h2><p>{t('admin.finance.commandCenter.performanceSubtitle')}</p></div>
        <div className="fcc-legend" aria-label={t('admin.finance.commandCenter.legend')}>
          <span><i className="fcc-legend__dot fcc-legend__dot--due" />{t('admin.finance.commandCenter.due')}</span>
          <span><i className="fcc-legend__dot fcc-legend__dot--collected" />{t('admin.finance.commandCenter.collected')}</span>
        </div>
      </div>

      {!complete ? <InfoBanner tone="amber" title={t('admin.finance.commandCenter.dataQualityTitle')} description={t('admin.finance.commandCenter.performanceHistoricalUnavailable')} /> : null}

      <div className="card fcc-performance">
        <div className="fcc-performance__chart">
          {data.items.map((item) => (
            <button
              type="button"
              className="fcc-performance__month fcc-performance__month--interactive"
              key={item.period}
              disabled={!item.drilldown}
              onClick={() => item.drilldown && onOpenDecision(periodLabel(item.period, locale), item.drilldown)}
            >
              <span className="fcc-performance__bars" aria-label={periodLabel(item.period, locale)}>
                <span className="fcc-performance__bar fcc-performance__bar--due" style={{ height: `${Math.max(4, ((item.due_amount ?? 0) / max) * 100)}%` }} title={String(item.due_amount ?? 0)} />
                {item.recognized_collected_amount != null ? (
                  <span className="fcc-performance__bar fcc-performance__bar--collected" style={{ height: `${Math.max(4, (item.recognized_collected_amount / max) * 100)}%` }} title={String(item.recognized_collected_amount)} />
                ) : null}
              </span>
              <span>{periodLabel(item.period, locale)}</span>
              <strong>{item.collection_rate == null ? '—' : `${item.collection_rate.toFixed(1)}%`}</strong>
            </button>
          ))}
        </div>

        <MonthComparison data={data} />

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
  const max = Math.max(1, ...data.items.map((item) => item.amount ?? 0));

  return (
    <section className="fcc-section">
      <div className="fcc-section__head">
        <div><h2>{t('admin.finance.commandCenter.agingTitle')}</h2><p>{t('admin.finance.commandCenter.agingSubtitle')}</p></div>
        <div className="fcc-section__summary"><span>{t('admin.finance.commandCenter.outstanding')}</span><FinanceMoney amount={data.summary.outstanding_amount} currency={currency} /></div>
      </div>
      <div className="card fcc-aging">
        {data.items.map((item) => (
          <button
            type="button"
            className="fcc-aging__row fcc-aging__row--interactive"
            key={item.key}
            disabled={!item.drilldown}
            onClick={() => item.drilldown && onOpenDecision(t(`admin.finance.commandCenter.aging.${item.key}`), item.drilldown)}
          >
            <span className="fcc-aging__label">
              <strong>{t(`admin.finance.commandCenter.aging.${item.key}`)}</strong>
              <span>{t('admin.finance.commandCenter.installmentsCount', { count: String(item.installments_count) })}</span>
            </span>
            <span className="fcc-aging__track" aria-hidden="true"><span style={{ width: `${Math.max(2, ((item.amount ?? 0) / max) * 100)}%` }} /></span>
            <span className="fcc-aging__value">
              <FinanceMoney amount={item.amount} currency={currency} />
              {item.key !== 'current' && item.percentage_of_overdue != null ? <small><bdi dir="ltr">{item.percentage_of_overdue.toFixed(1)}%</bdi></small> : null}
            </span>
          </button>
        ))}
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
      <div className="fcc-section__head"><div><h2>{t('admin.finance.commandCenter.attentionTitle')}</h2><p>{t('admin.finance.commandCenter.attentionSubtitle')}</p></div></div>
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
                  {item.count != null ? <strong><bdi dir="ltr">{item.count}</bdi></strong> : null}
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
  const { activeAcademicYearId, academicYearLoading, academicYearError } = useAdminSession();
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
      <CommandCenterHeader refreshing={commandCenter.refreshing} onRefresh={commandCenter.refresh} />
      <ContextBar period={period} onPeriodChange={setPeriod} summary={summary} />

      {commandCenter.summary.initialLoading ? (
        <div className="fcc-kpi-grid" aria-busy="true">{Array.from({ length: 4 }).map((_, index) => <div className="card fcc-kpi fcc-skeleton" key={index} />)}</div>
      ) : commandCenter.summary.error ? (
        <ApiErrorView error={commandCenter.summary.error} onRetry={commandCenter.summary.reload} />
      ) : summary ? (
        <SummarySection summary={summary} onOpenDecision={openDecision} />
      ) : null}

      <PerformanceSection
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
