'use client';

import type { CSSProperties } from 'react';
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconUsers,
  IconWallet,
} from '@/components/icons/admin-icons';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  formatTimelinePeriod,
  highestOverdueService,
  lowestCollectionService,
  rankedServiceFacets,
  resolveInstallmentPerformance,
  segmentPercent,
  timelineWindow,
} from '@/features/admin/finance/installments-analytics-utils';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type {
  FinanceInstallmentAttention,
  FinanceInstallmentListSummary,
  FinanceInstallmentServiceFacet,
  FinanceInstallmentTimelinePoint,
} from '@/types/finance';

type AnalyticsWorkspaceProps = {
  summary: FinanceInstallmentListSummary | null;
  serviceFacets: FinanceInstallmentServiceFacet[];
  timeline: FinanceInstallmentTimelinePoint[];
  attention: FinanceInstallmentAttention | null;
  selectedServiceId: string;
  resultCount: number;
  onSelectService: (serviceId: number | null) => void;
  onQuickFilter: (quick: 'overdue_unpaid' | 'due_next_7_days') => void;
  onOpenServiceOverdue: (serviceId: number) => void;
};

type WidthStyle = CSSProperties & { '--segment-width': string };
type HeightStyle = CSSProperties & { '--bar-height': string };
type PositionStyle = CSSProperties & { '--marker-position': string };

function Metric({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'primary' | 'paid' | 'expected' | 'overdue';
  detail?: string;
}) {
  return (
    <div className="installments-analytics__metric" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function ServicePerformanceRows({
  facets,
  selectedServiceId,
  onSelectService,
}: {
  facets: FinanceInstallmentServiceFacet[];
  selectedServiceId: string;
  onSelectService: (serviceId: number | null) => void;
}) {
  const t = useT();
  const ordered = rankedServiceFacets(facets);

  return (
    <div className="installments-service-performance">
      <div className="installments-service-performance__legend" aria-label={t('admin.finance.installments.analytics.legend')}>
        <span data-tone="paid">{t('admin.finance.installments.analytics.paid')}</span>
        <span data-tone="expected">{t('admin.finance.installments.analytics.expected')}</span>
        <span data-tone="overdue">{t('admin.finance.installments.analytics.overdue')}</span>
      </div>
      <div className="installments-service-performance__head" aria-hidden>
        <span>{t('admin.finance.installments.analytics.service')}</span>
        <span>{t('admin.finance.installments.analytics.beneficiaries')}</span>
        <span>{t('admin.finance.installments.analytics.totalDue')}</span>
        <span>{t('admin.finance.installments.analytics.performance')}</span>
        <span>{t('admin.finance.installments.analytics.collectionRate')}</span>
      </div>
      <div className="installments-service-performance__rows">
        {ordered.map((facet, index) => {
          const performance = resolveInstallmentPerformance(facet);
          const selected = selectedServiceId === String(facet.service_id);
          const paidPct = segmentPercent(performance.paidAmount, performance.totalAmount);
          const expectedPct = segmentPercent(performance.expectedAmount, performance.totalAmount);
          const overduePct = segmentPercent(performance.overdueAmount, performance.totalAmount);
          const beneficiaries = facet.beneficiary_count;

          return (
            <button
              key={facet.service_id}
              type="button"
              className="installments-service-performance__row"
              data-selected={selected || undefined}
              aria-pressed={selected}
              aria-label={t('admin.finance.installments.analytics.selectService', {
                service: facet.service_name,
              })}
              onClick={() => onSelectService(selected ? null : facet.service_id)}
            >
              <span className="installments-service-performance__service">
                <span className="installments-service-performance__rank" aria-hidden>{index + 1}</span>
                <span>
                  <strong dir="auto">{facet.service_name}</strong>
                  <small>{t('admin.finance.installments.analytics.installmentsCount', { count: facet.count })}</small>
                </span>
              </span>
              <span className="installments-service-performance__beneficiaries">
                <IconUsers size={15} aria-hidden />
                <bdi dir="ltr">{beneficiaries ?? t('common.dash')}</bdi>
              </span>
              <span className="installments-service-performance__total">
                <FinanceMoney amount={performance.totalAmount} />
              </span>
              <span className="installments-service-performance__bar-wrap">
                <span className="installments-service-performance__amounts">
                  <span data-tone="paid"><FinanceMoney amount={performance.paidAmount} /></span>
                  <span data-tone="expected"><FinanceMoney amount={performance.expectedAmount} /></span>
                  <span data-tone="overdue"><FinanceMoney amount={performance.overdueAmount} /></span>
                </span>
                <span className="installments-service-performance__bar" aria-hidden>
                  {paidPct > 0 ? (
                    <span data-tone="paid" style={{ '--segment-width': `${paidPct}%` } as WidthStyle} />
                  ) : null}
                  {expectedPct > 0 ? (
                    <span data-tone="expected" style={{ '--segment-width': `${expectedPct}%` } as WidthStyle} />
                  ) : null}
                  {overduePct > 0 ? (
                    <span data-tone="overdue" style={{ '--segment-width': `${overduePct}%` } as WidthStyle} />
                  ) : null}
                </span>
              </span>
              <span className="installments-service-performance__rate">
                <strong dir="ltr">{Math.round(performance.collectionRate)}%</strong>
                <span className="installments-service-performance__rate-track" aria-hidden>
                  <span style={{ '--segment-width': `${performance.collectionRate}%` } as WidthStyle} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectedServiceSummary({ facet }: { facet: FinanceInstallmentServiceFacet | null }) {
  const t = useT();
  if (!facet) {
    return (
      <div className="installments-service-detail installments-service-detail--empty">
        <IconCheckCircle size={22} aria-hidden />
        <div>
          <h3>{t('admin.finance.installments.analytics.allServices')}</h3>
          <p>{t('admin.finance.installments.analytics.selectServiceHint')}</p>
        </div>
      </div>
    );
  }

  const performance = resolveInstallmentPerformance(facet);
  return (
    <section className="installments-service-detail" aria-labelledby="installments-service-detail-title">
      <div className="installments-service-detail__head">
        <div>
          <span>{t('admin.finance.installments.analytics.selectedService')}</span>
          <h3 id="installments-service-detail-title" dir="auto">{facet.service_name}</h3>
        </div>
        <div
          className="installments-service-detail__gauge"
          aria-label={t('admin.finance.installments.analytics.collectionRateValue', {
            rate: Math.round(performance.collectionRate),
          })}
        >
          <strong dir="ltr">{Math.round(performance.collectionRate)}%</strong>
          <span>{t('admin.finance.installments.analytics.collected')}</span>
          <progress max={100} value={performance.collectionRate} aria-hidden />
        </div>
      </div>
      <dl className="installments-service-detail__stats">
        <div>
          <dt>{t('admin.finance.installments.analytics.beneficiaries')}</dt>
          <dd dir="ltr">{facet.beneficiary_count ?? t('common.dash')}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.installments.analytics.averageDue')}</dt>
          <dd><FinanceMoney amount={facet.average_due_per_beneficiary} /></dd>
        </div>
        <div>
          <dt>{t('admin.finance.installments.analytics.averageOverdue')}</dt>
          <dd data-tone="overdue"><FinanceMoney amount={facet.average_overdue_per_beneficiary} /></dd>
        </div>
      </dl>
    </section>
  );
}

function AttentionPanel({
  facets,
  attention,
  onSelectService,
  onQuickFilter,
  onOpenServiceOverdue,
}: {
  facets: FinanceInstallmentServiceFacet[];
  attention: FinanceInstallmentAttention | null;
  onSelectService: (serviceId: number | null) => void;
  onQuickFilter: (quick: 'overdue_unpaid' | 'due_next_7_days') => void;
  onOpenServiceOverdue: (serviceId: number) => void;
}) {
  const t = useT();
  const overdue = highestOverdueService(facets);
  const lowCollection = lowestCollectionService(facets);
  const dueSoon = attention?.due_next_7_days;

  return (
    <section className="installments-attention" aria-labelledby="installments-attention-title">
      <div className="installments-attention__head">
        <IconAlertTriangle size={18} aria-hidden />
        <h3 id="installments-attention-title">{t('admin.finance.installments.analytics.attention')}</h3>
        <span dir="ltr">{[overdue, lowCollection, dueSoon?.count ? dueSoon : null].filter(Boolean).length}</span>
      </div>
      <div className="installments-attention__items">
        {overdue ? (
          <article data-tone="overdue">
            <div>
              <strong>{t('admin.finance.installments.analytics.highestOverdue', { service: overdue.service_name })}</strong>
              <p><FinanceMoney amount={overdue.total_overdue} /> · {t('admin.finance.installments.analytics.installmentsCount', { count: overdue.count })}</p>
            </div>
            <button type="button" onClick={() => onOpenServiceOverdue(overdue.service_id)}>
              {t('admin.finance.installments.analytics.viewOverdue')}
            </button>
          </article>
        ) : null}
        {lowCollection ? (
          <article data-tone="expected">
            <div>
              <strong>{t('admin.finance.installments.analytics.lowCollection', { service: lowCollection.service_name })}</strong>
              <p>{t('admin.finance.installments.analytics.collectionRateValue', { rate: Math.round(resolveInstallmentPerformance(lowCollection).collectionRate) })}</p>
            </div>
            <button type="button" onClick={() => onSelectService(lowCollection.service_id)}>
              {t('admin.finance.installments.analytics.reviewService')}
            </button>
          </article>
        ) : null}
        {dueSoon?.count ? (
          <article data-tone="primary">
            <div>
              <strong>{t('admin.finance.installments.analytics.dueSoonTitle')}</strong>
              <p>{t('admin.finance.installments.analytics.dueSoonDetail', { count: dueSoon.count })} · <FinanceMoney amount={dueSoon.amount} /></p>
            </div>
            <button type="button" onClick={() => onQuickFilter('due_next_7_days')}>
              {t('admin.finance.installments.analytics.viewDueSoon')}
            </button>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function TimelineChart({ timeline }: { timeline: FinanceInstallmentTimelinePoint[] }) {
  const t = useT();
  const { locale } = useLocale();
  const points = timelineWindow(timeline);
  const maxAmount = Math.max(...points.flatMap((point) => [point.total_paid, point.total_expected]), 1);

  return (
    <section className="installments-timeline" aria-labelledby="installments-timeline-title">
      <div className="installments-analytics__section-head">
        <div>
          <h3 id="installments-timeline-title">{t('admin.finance.installments.analytics.timelineTitle')}</h3>
          <p>{t('admin.finance.installments.analytics.timelineHint')}</p>
        </div>
        <div className="installments-timeline__legend">
          <span data-tone="paid">{t('admin.finance.installments.analytics.paid')}</span>
          <span data-tone="expected">{t('admin.finance.installments.analytics.expected')}</span>
          <span data-tone="overdue">{t('admin.finance.installments.analytics.overdue')}</span>
        </div>
      </div>
      {points.length ? (
        <div className="installments-timeline__plot">
          {points.map((point) => (
            <div className="installments-timeline__point" key={point.period}>
              <div className="installments-timeline__bars">
                <span
                  data-tone="paid"
                  style={{ '--bar-height': `${Math.max((point.total_paid / maxAmount) * 100, point.total_paid ? 5 : 0)}%` } as HeightStyle}
                  aria-label={`${t('admin.finance.installments.analytics.paid')}: ${point.total_paid}`}
                />
                <span
                  data-tone="expected"
                  style={{ '--bar-height': `${Math.max((point.total_expected / maxAmount) * 100, point.total_expected ? 5 : 0)}%` } as HeightStyle}
                  aria-label={`${t('admin.finance.installments.analytics.expected')}: ${point.total_expected}`}
                />
              </div>
              <span className="installments-timeline__overdue"><FinanceMoney amount={point.total_overdue} /></span>
              <strong>{formatTimelinePeriod(point.period, locale)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="installments-analytics__empty">{t('admin.finance.installments.analytics.timelineEmpty')}</p>
      )}
    </section>
  );
}

function BeneficiaryComparison({
  facets,
  schoolAverage,
}: {
  facets: FinanceInstallmentServiceFacet[];
  schoolAverage: number;
}) {
  const t = useT();
  const rows = rankedServiceFacets(facets).slice(0, 6);
  const maxAverage = Math.max(
    schoolAverage,
    ...rows.map((facet) => facet.average_due_per_beneficiary ?? 0),
    1,
  );

  return (
    <section className="installments-beneficiary-chart" aria-labelledby="installments-beneficiary-title">
      <div className="installments-analytics__section-head">
        <div>
          <h3 id="installments-beneficiary-title">{t('admin.finance.installments.analytics.beneficiaryTitle')}</h3>
          <p>{t('admin.finance.installments.analytics.beneficiaryHint')}</p>
        </div>
        <span className="installments-beneficiary-chart__school-average">
          {t('admin.finance.installments.analytics.schoolAverage')}: <FinanceMoney amount={schoolAverage} />
        </span>
      </div>
      <div className="installments-beneficiary-chart__rows">
        {rows.map((facet) => {
          const averageDue = facet.average_due_per_beneficiary ?? 0;
          const averageOverdue = facet.average_overdue_per_beneficiary ?? 0;
          const duePosition = segmentPercent(averageDue, maxAverage);
          const overduePosition = segmentPercent(averageOverdue, maxAverage);
          const averagePosition = segmentPercent(schoolAverage, maxAverage);
          return (
            <div className="installments-beneficiary-chart__row" key={facet.service_id}>
              <span className="installments-beneficiary-chart__service">
                <strong dir="auto">{facet.service_name}</strong>
                <small>{t('admin.finance.installments.analytics.beneficiaryCount', { count: facet.beneficiary_count ?? 0 })}</small>
              </span>
              <span className="installments-beneficiary-chart__track" aria-hidden>
                <span className="installments-beneficiary-chart__average" style={{ '--marker-position': `${averagePosition}%` } as PositionStyle} />
                <span data-tone="due" style={{ '--marker-position': `${duePosition}%` } as PositionStyle} />
                <span data-tone="overdue" style={{ '--marker-position': `${overduePosition}%` } as PositionStyle} />
              </span>
              <span className="installments-beneficiary-chart__values">
                <span><FinanceMoney amount={averageDue} /></span>
                <span data-tone="overdue"><FinanceMoney amount={averageOverdue} /></span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function InstallmentsAnalyticsWorkspace({
  summary,
  serviceFacets,
  timeline,
  attention,
  selectedServiceId,
  resultCount,
  onSelectService,
  onQuickFilter,
  onOpenServiceOverdue,
}: AnalyticsWorkspaceProps) {
  const t = useT();
  const performance = resolveInstallmentPerformance(summary);
  const selectedFacet = serviceFacets.find((facet) => String(facet.service_id) === selectedServiceId) ?? null;
  const count = summary?.total_count ?? resultCount;

  return (
    <div className="installments-analytics">
      <section className="installments-analytics__metrics" aria-label={t('admin.finance.installments.analytics.summary')}>
        <Metric label={t('admin.finance.installments.analytics.totalDue')} value={<FinanceMoney amount={performance.totalAmount} />} tone="primary" detail={t('admin.finance.installments.analytics.installmentsCount', { count })} />
        <Metric label={t('admin.finance.installments.analytics.paid')} value={<FinanceMoney amount={performance.paidAmount} />} tone="paid" />
        <Metric label={t('admin.finance.installments.analytics.expected')} value={<FinanceMoney amount={performance.expectedAmount} />} tone="expected" detail={t('admin.finance.installments.analytics.expectedHint')} />
        <Metric label={t('admin.finance.installments.analytics.overdue')} value={<FinanceMoney amount={performance.overdueAmount} />} tone="overdue" />
        <Metric label={t('admin.finance.installments.analytics.collectionRate')} value={<bdi dir="ltr">{Math.round(performance.collectionRate)}%</bdi>} detail={t('admin.finance.installments.analytics.beneficiaryCount', { count: summary?.beneficiary_count ?? 0 })} />
      </section>

      <div className="installments-analytics__main-grid">
        <section className="installments-analytics__services" aria-labelledby="installments-services-performance-title">
          <div className="installments-analytics__section-head">
            <div>
              <h2 id="installments-services-performance-title">{t('admin.finance.installments.analytics.servicesTitle')}</h2>
              <p>{t('admin.finance.installments.analytics.servicesHint')}</p>
            </div>
            {selectedServiceId ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onSelectService(null)}>
                {t('admin.finance.installments.servicesFilter.all')}
              </button>
            ) : null}
          </div>
          <ServicePerformanceRows facets={serviceFacets} selectedServiceId={selectedServiceId} onSelectService={onSelectService} />
        </section>
        <aside className="installments-analytics__side">
          <SelectedServiceSummary facet={selectedFacet} />
          <AttentionPanel
            facets={serviceFacets}
            attention={attention}
            onSelectService={onSelectService}
            onQuickFilter={onQuickFilter}
            onOpenServiceOverdue={onOpenServiceOverdue}
          />
        </aside>
      </div>

      <div className="installments-analytics__secondary-grid">
        <TimelineChart timeline={timeline} />
        <BeneficiaryComparison facets={serviceFacets} schoolAverage={summary?.average_due_per_beneficiary ?? 0} />
      </div>
    </div>
  );
}
