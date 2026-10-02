'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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
  FinanceCommandCenterPerformance,
  FinanceCommandCenterSummary,
} from '@/types/finance-command-center';
import {
  DEFAULT_COMMAND_CENTER_PERIOD,
  appendAcademicYearToFinancePath,
  isCommandCenterPeriodReady,
  type FinanceCommandCenterPeriodPreset,
  type FinanceCommandCenterPeriodState,
} from './command-center-contract';
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

function kpiHref(
  kind: 'due' | 'collected' | 'overdue',
  yearId: number,
  asOfDate?: string | null,
): string {
  if (kind === 'collected') return '/admin/finance/collections?state=confirmed';
  const params = new URLSearchParams({ academic_year_id: String(yearId) });
  if (kind === 'overdue') params.set('quick', 'overdue_unpaid');
  if (kind === 'due' && asOfDate) params.set('due_date_to', asOfDate);
  return `/admin/finance/installments?${params.toString()}`;
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
  const {
    activeSchoolId,
    schools,
    activeAcademicYearId,
    academicYears,
    setActiveAcademicYear,
    academicYearLoading,
  } = useAdminSession();

  const activeSchool = schools.find((school) => school.id === activeSchoolId);
  const selectedYear = academicYears.find((year) => year.id === activeAcademicYearId);
  const asOfDate = summary?.meta.as_of_date;
  const generatedAt = summary?.meta.generated_at;

  return (
    <section className="card fcc-context" aria-label={t('admin.finance.commandCenter.contextTitle')}>
      <div className="fcc-context__identity">
        <div className="fcc-context__fact">
          <span>{t('admin.finance.commandCenter.school')}</span>
          <strong dir="auto">{activeSchool?.name ?? t('common.dash')}</strong>
        </div>
        <label className="fcc-context__fact">
          <span>{t('admin.finance.commandCenter.academicYear')}</span>
          <select
            className="input"
            value={activeAcademicYearId ?? ''}
            disabled={academicYearLoading}
            onChange={(event) => {
              const id = Number(event.target.value);
              if (Number.isFinite(id) && id > 0) setActiveAcademicYear(id);
            }}
          >
            {activeAcademicYearId == null ? (
              <option value="">{t('admin.finance.commandCenter.selectAcademicYear')}</option>
            ) : null}
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>{year.name}</option>
            ))}
          </select>
          {selectedYear ? <small>{selectedYear.name}</small> : null}
        </label>
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
  href,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string | null;
  tone?: 'default' | 'danger' | 'success' | 'warning';
}) {
  const body = (
    <>
      <span className="fcc-kpi__label">{label}</span>
      <strong className="fcc-kpi__value">{value}</strong>
      {hint ? <span className="fcc-kpi__hint">{hint}</span> : null}
    </>
  );
  const className = `card fcc-kpi fcc-kpi--${tone ?? 'default'}`;
  return href ? <Link href={href} className={className}>{body}</Link> : <article className={className}>{body}</article>;
}

function SummarySection({ summary }: { summary: FinanceCommandCenterSummary }) {
  const t = useT();
  const yearId = summary.meta.academic_year_id;
  const currency = summary.meta.currency?.name;
  const due = summary.kpis.due_to_date;
  const collected = summary.kpis.recognized_collected_to_date;
  const rate = summary.kpis.collection_rate_to_date;
  const overdue = summary.kpis.overdue;
  const liquidity = summary.unavailable_metrics.available_liquidity;
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
            href={kpiHref('due', yearId, summary.meta.as_of_date)}
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
            href={collected.available ? kpiHref('collected', yearId) : null}
            tone="success"
          />
          <MetricCard
            label={t('admin.finance.commandCenter.kpi.collectionRate')}
            value={rate.available ? percentage(rate.value) : t('admin.finance.commandCenter.unavailable')}
            hint={rate.available ? t('admin.finance.commandCenter.sameDueCohort') : t(availabilityReasonKey(rate.reason_code))}
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
            href={overdue.available ? kpiHref('overdue', yearId) : null}
            tone="danger"
          />
        </div>

        <div className="fcc-treasury-grid">
          <MetricCard
            label={t('admin.finance.commandCenter.kpi.availableLiquidity')}
            value={liquidity.available ? t('common.dash') : t('admin.finance.commandCenter.unavailable')}
            hint={t(availabilityReasonKey(liquidity.reason_code))}
            tone="warning"
          />
          <MetricCard
            label={t('admin.finance.commandCenter.kpi.expectedLiquidity30')}
            value={forecast.available ? t('common.dash') : t('admin.finance.commandCenter.unavailable')}
            hint={t(availabilityReasonKey(forecast.reason_code))}
            tone="warning"
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

function PerformanceSection({
  data,
  loading,
  error,
  reload,
  periodReady,
}: {
  data: FinanceCommandCenterPerformance | null;
  loading: boolean;
  error: Parameters<typeof ApiErrorView>[0]['error'] | null;
  reload: () => void;
  periodReady: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  if (!periodReady) {
    return (
      <section className="fcc-section">
        <div className="fcc-section__head">
          <div><h2>{t('admin.finance.commandCenter.performanceTitle')}</h2></div>
        </div>
        <EmptyState
          compact
          title={t('admin.finance.commandCenter.customPeriodIncompleteTitle')}
          description={t('admin.finance.commandCenter.customPeriodIncompleteDesc')}
        />
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

  const max = Math.max(
    1,
    ...data.items.flatMap((item) => [
      item.due_amount ?? 0,
      item.recognized_collected_amount ?? 0,
    ]),
  );
  const currency = data.meta.currency?.name;
  const complete = data.data_quality?.historical_settlement_attribution_complete !== false;

  return (
    <section className="fcc-section">
      <div className="fcc-section__head">
        <div>
          <h2>{t('admin.finance.commandCenter.performanceTitle')}</h2>
          <p>{t('admin.finance.commandCenter.performanceSubtitle')}</p>
        </div>
        <div className="fcc-legend" aria-label={t('admin.finance.commandCenter.legend')}>
          <span><i className="fcc-legend__dot fcc-legend__dot--due" />{t('admin.finance.commandCenter.due')}</span>
          <span><i className="fcc-legend__dot fcc-legend__dot--collected" />{t('admin.finance.commandCenter.collected')}</span>
        </div>
      </div>

      {!complete ? (
        <InfoBanner
          tone="amber"
          title={t('admin.finance.commandCenter.dataQualityTitle')}
          description={t('admin.finance.commandCenter.performanceHistoricalUnavailable')}
        />
      ) : null}

      <div className="card fcc-performance">
        <div className="fcc-performance__chart">
          {data.items.map((item) => (
            <div className="fcc-performance__month" key={item.period}>
              <div className="fcc-performance__bars" aria-label={periodLabel(item.period, locale)}>
                <span
                  className="fcc-performance__bar fcc-performance__bar--due"
                  style={{ height: `${Math.max(4, ((item.due_amount ?? 0) / max) * 100)}%` }}
                  title={String(item.due_amount ?? 0)}
                />
                {item.recognized_collected_amount != null ? (
                  <span
                    className="fcc-performance__bar fcc-performance__bar--collected"
                    style={{ height: `${Math.max(4, (item.recognized_collected_amount / max) * 100)}%` }}
                    title={String(item.recognized_collected_amount)}
                  />
                ) : null}
              </div>
              <span>{periodLabel(item.period, locale)}</span>
              <strong>{item.collection_rate == null ? '—' : `${item.collection_rate.toFixed(1)}%`}</strong>
            </div>
          ))}
        </div>

        <div className="fcc-table-wrap">
          <table className="fcc-table">
            <thead>
              <tr>
                <th>{t('admin.finance.commandCenter.periodColumn')}</th>
                <th>{t('admin.finance.commandCenter.due')}</th>
                <th>{t('admin.finance.commandCenter.collected')}</th>
                <th>{t('admin.finance.commandCenter.collectionRate')}</th>
                <th>{t('admin.finance.commandCenter.remaining')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.period}>
                  <td>{periodLabel(item.period, locale)}</td>
                  <td><FinanceMoney amount={item.due_amount} currency={currency} /></td>
                  <td>
                    {item.recognized_collected_amount == null
                      ? <span className="muted">—</span>
                      : <FinanceMoney amount={item.recognized_collected_amount} currency={currency} />}
                  </td>
                  <td>{percentage(item.collection_rate)}</td>
                  <td>
                    {item.remaining_amount == null
                      ? <span className="muted">—</span>
                      : <FinanceMoney amount={item.remaining_amount} currency={currency} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function AgingSection({ data, loading, error, reload }: {
  data: FinanceCommandCenterAging | null;
  loading: boolean;
  error: Parameters<typeof ApiErrorView>[0]['error'] | null;
  reload: () => void;
}) {
  const t = useT();
  if (loading && !data) return <LoadingState label={t('admin.finance.commandCenter.loadingAging')} />;
  if (error) return <ApiErrorView error={error} onRetry={reload} />;
  if (!data) return null;

  if (!data.summary.available) {
    return (
      <section className="fcc-section">
        <div className="fcc-section__head"><div><h2>{t('admin.finance.commandCenter.agingTitle')}</h2></div></div>
        <InfoBanner
          tone="amber"
          title={t('admin.finance.commandCenter.agingUnavailableTitle')}
          description={t(availabilityReasonKey(data.summary.reason_code))}
        />
      </section>
    );
  }

  const currency = data.meta.currency?.name;
  const max = Math.max(1, ...data.items.map((item) => item.amount ?? 0));
  const yearId = data.meta.academic_year_id;

  return (
    <section className="fcc-section">
      <div className="fcc-section__head">
        <div>
          <h2>{t('admin.finance.commandCenter.agingTitle')}</h2>
          <p>{t('admin.finance.commandCenter.agingSubtitle')}</p>
        </div>
        <div className="fcc-section__summary">
          <span>{t('admin.finance.commandCenter.outstanding')}</span>
          <FinanceMoney amount={data.summary.outstanding_amount} currency={currency} />
        </div>
      </div>
      <div className="card fcc-aging">
        {data.items.map((item) => {
          const quick = item.key === 'current' ? 'has_balance' : 'overdue_unpaid';
          const href = `/admin/finance/installments?quick=${quick}&academic_year_id=${yearId}`;
          return (
            <Link className="fcc-aging__row" href={href} key={item.key}>
              <div className="fcc-aging__label">
                <strong>{t(`admin.finance.commandCenter.aging.${item.key}`)}</strong>
                <span>{t('admin.finance.commandCenter.installmentsCount', { count: String(item.installments_count) })}</span>
              </div>
              <div className="fcc-aging__track" aria-hidden="true">
                <span style={{ width: `${Math.max(2, ((item.amount ?? 0) / max) * 100)}%` }} />
              </div>
              <div className="fcc-aging__value">
                <FinanceMoney amount={item.amount} currency={currency} />
                {item.key !== 'current' && item.percentage_of_overdue != null ? (
                  <small><bdi dir="ltr">{item.percentage_of_overdue.toFixed(1)}%</bdi></small>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function attentionTitle(item: FinanceCommandCenterAttentionItem, t: ReturnType<typeof useT>): string {
  const key = ATTENTION_TYPES.has(item.type) ? item.type : 'other';
  return t(`admin.finance.commandCenter.attention.${key}`);
}

function AttentionSection({
  data,
  loading,
  error,
  reload,
}: {
  data: { meta: FinanceCommandCenterSummary['meta']; items: FinanceCommandCenterAttentionItem[] } | null;
  loading: boolean;
  error: Parameters<typeof ApiErrorView>[0]['error'] | null;
  reload: () => void;
}) {
  const t = useT();
  if (loading && !data) return <LoadingState label={t('admin.finance.commandCenter.loadingAttention')} />;
  if (error) return <ApiErrorView error={error} onRetry={reload} />;
  if (!data) return null;

  const visible = data.items.filter((item) => {
    if (item.type === 'finance_data_quality') return true;
    return (item.count ?? 0) > 0 || (item.amount ?? 0) > 0;
  });
  const currency = data.meta.currency?.name;

  return (
    <section className="fcc-section">
      <div className="fcc-section__head">
        <div>
          <h2>{t('admin.finance.commandCenter.attentionTitle')}</h2>
          <p>{t('admin.finance.commandCenter.attentionSubtitle')}</p>
        </div>
      </div>
      {!visible.length ? (
        <div className="card fcc-attention-empty">
          <strong>{t('admin.finance.commandCenter.attentionClearTitle')}</strong>
          <span>{t('admin.finance.commandCenter.attentionClearDesc')}</span>
        </div>
      ) : (
        <div className="fcc-attention-grid">
          {visible.map((item, index) => {
            const href = appendAcademicYearToFinancePath(
              item.action_path,
              data.meta.academic_year_id,
            );
            const tone =
              item.severity === 'high'
                ? 'red'
                : item.severity === 'medium'
                  ? 'amber'
                  : 'blue';
            return (
              <article className={`card fcc-attention fcc-attention--${item.severity}`} key={`${item.type}-${index}`}>
                <div className="fcc-attention__head">
                  <Badge tone={tone}>{t(`admin.finance.commandCenter.severity.${item.severity === 'high' || item.severity === 'medium' ? item.severity : 'info'}`)}</Badge>
                  {item.count != null ? <strong><bdi dir="ltr">{item.count}</bdi></strong> : null}
                </div>
                <h3>{attentionTitle(item, t)}</h3>
                <p>{t(availabilityReasonKey(item.reason_code))}</p>
                {item.amount != null ? (
                  <FinanceMoney amount={item.amount} currency={currency} />
                ) : null}
                {href ? (
                  <Link href={href} className="btn btn--ghost btn--sm">
                    {t('admin.finance.commandCenter.openAction')}
                  </Link>
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
  const {
    activeAcademicYearId,
    academicYearLoading,
    academicYearError,
  } = useAdminSession();
  const [period, setPeriod] = useState<FinanceCommandCenterPeriodState>(
    DEFAULT_COMMAND_CENTER_PERIOD,
  );
  const commandCenter = useFinanceCommandCenter(period);
  const summary = commandCenter.summary.data;

  const periodReady = useMemo(
    () => isCommandCenterPeriodReady(period, summary?.meta.as_of_date),
    [period, summary?.meta.as_of_date],
  );

  if (academicYearLoading && activeAcademicYearId == null) {
    return <LoadingState label={t('admin.finance.commandCenter.loadingContext')} />;
  }

  if (academicYearError) {
    return (
      <ErrorState
        error={{
          code: academicYearError.code,
          message: academicYearError.message,
          details: {},
        }}
      />
    );
  }

  if (activeAcademicYearId == null) {
    return (
      <EmptyState
        title={t('admin.finance.commandCenter.yearRequiredTitle')}
        description={t('admin.finance.commandCenter.yearRequiredDesc')}
      />
    );
  }

  return (
    <div className="admin-workspace finance-command-center">
      <CommandCenterHeader
        refreshing={commandCenter.refreshing}
        onRefresh={commandCenter.refresh}
      />
      <ContextBar period={period} onPeriodChange={setPeriod} summary={summary} />

      {commandCenter.summary.initialLoading ? (
        <div className="fcc-kpi-grid" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="card fcc-kpi fcc-skeleton" key={index} />
          ))}
        </div>
      ) : commandCenter.summary.error ? (
        <ApiErrorView
          error={commandCenter.summary.error}
          onRetry={commandCenter.summary.reload}
        />
      ) : summary ? (
        <SummarySection summary={summary} />
      ) : null}

      <PerformanceSection
        data={commandCenter.performance.data}
        loading={commandCenter.performance.initialLoading}
        error={commandCenter.performance.error}
        reload={commandCenter.performance.reload}
        periodReady={periodReady}
      />

      <div className="fcc-decision-grid">
        <AgingSection
          data={commandCenter.aging.data}
          loading={commandCenter.aging.initialLoading}
          error={commandCenter.aging.error}
          reload={commandCenter.aging.reload}
        />
        <AttentionSection
          data={commandCenter.attention.data}
          loading={commandCenter.attention.initialLoading}
          error={commandCenter.attention.error}
          reload={commandCenter.attention.reload}
        />
      </div>
    </div>
  );
}
