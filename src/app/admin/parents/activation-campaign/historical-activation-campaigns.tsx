'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, InfoBanner, StatCard } from '@/components/ui/primitives';
import { useLocale } from '@/features/i18n/locale-context';
import {
  formatHistoricalDate,
  getHistoricalActivationStatusLabel,
  getHistoricalMessageStatusLabel,
  getParentActivationHistoricalCopy,
  historicalMessageSummaryIsBalanced,
} from '@/features/parents/parent-activation-historical-analytics';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Locale } from '@/lib/i18n/config';
import type {
  ParentActivationHistoricalActivationStatus,
  ParentActivationHistoricalAnalytics,
  ParentActivationHistoricalCampaignList,
  ParentActivationHistoricalMessageStatus,
  ParentActivationHistoricalRecipientPage,
} from '@/types/parent-activation-campaign';
import styles from './historical-activation-campaigns.module.css';

const MESSAGE_STATUSES: ParentActivationHistoricalMessageStatus[] = [
  'not_sent',
  'queued',
  'processing',
  'sent',
  'delivered',
  'read',
  'failed',
  'unavailable',
];

const ACTIVATION_STATUSES: ParentActivationHistoricalActivationStatus[] = [
  'activated_via_campaign_link',
  'pending_valid_link',
  'expired',
  'revoked',
  'not_issued',
  'unknown',
];

type Drilldown =
  | { kind: 'message'; status: ParentActivationHistoricalMessageStatus; label: string }
  | { kind: 'activation'; status: ParentActivationHistoricalActivationStatus; label: string };

export function HistoricalActivationCampaigns() {
  const { locale } = useLocale();
  const copy = getParentActivationHistoricalCopy(locale);
  const [page, setPage] = useState(1);
  const [campaignList, setCampaignList] = useState<ParentActivationHistoricalCampaignList | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<ParentActivationHistoricalAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [drilldown, setDrilldown] = useState<Drilldown | null>(null);
  const [recipientPage, setRecipientPage] = useState<ParentActivationHistoricalRecipientPage | null>(null);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [recipientError, setRecipientError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setListLoading(true);
    setListError(false);
    api.get<ParentActivationHistoricalCampaignList>(
      endpoints.admin.parentActivationCampaigns,
      { page, limit: 8, sort: 'id_desc' },
      { signal: controller.signal },
    ).then((response) => {
      if (!active) return;
      if (!response.success) {
        setListError(true);
        setCampaignList(null);
        setSelectedCampaignId(null);
        return;
      }
      setCampaignList(response.data);
      setSelectedCampaignId(response.data.items[0]?.id ?? null);
    }).catch(() => {
      if (active) setListError(true);
    }).finally(() => {
      if (active) setListLoading(false);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [page, refreshKey]);

  useEffect(() => {
    if (!selectedCampaignId) {
      setAnalytics(null);
      setDrilldown(null);
      setRecipientPage(null);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setAnalyticsLoading(true);
    setAnalyticsError(false);
    setDrilldown(null);
    setRecipientPage(null);
    api.get<ParentActivationHistoricalAnalytics>(
      endpoints.admin.parentActivationCampaignAnalytics(selectedCampaignId),
      undefined,
      { signal: controller.signal },
    ).then((response) => {
      if (!active) return;
      if (!response.success) {
        setAnalyticsError(true);
        setAnalytics(null);
        return;
      }
      setAnalytics(response.data);
    }).catch(() => {
      if (active) setAnalyticsError(true);
    }).finally(() => {
      if (active) setAnalyticsLoading(false);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCampaignId, refreshKey]);

  async function openDrilldown(next: Drilldown) {
    if (!selectedCampaignId) return;
    setDrilldown(next);
    setRecipientLoading(true);
    setRecipientError(false);
    setRecipientPage(null);
    const query = next.kind === 'message'
      ? { page: 1, limit: 50, message_status: next.status }
      : { page: 1, limit: 50, activation_status: next.status };
    const response = await api.get<ParentActivationHistoricalRecipientPage>(
      endpoints.admin.parentActivationCampaignRecipients(selectedCampaignId),
      query,
    );
    if (!response.success) {
      setRecipientError(true);
      setRecipientLoading(false);
      return;
    }
    setRecipientPage(response.data);
    setRecipientLoading(false);
  }

  const selectedListItem = useMemo(
    () => campaignList?.items.find((item) => item.id === selectedCampaignId) ?? null,
    [campaignList, selectedCampaignId],
  );

  return (
    <Card className={styles.historyCard}>
      <div className={styles.heading}>
        <div>
          <h2>{copy.title}</h2>
          <p className="muted">{copy.description}</p>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={listLoading || analyticsLoading}
        >
          {copy.refresh}
        </button>
      </div>

      {listLoading ? <p className={styles.loading}>{copy.loading}</p> : null}

      {listError ? (
        <div className={styles.errorBlock}>
          <InfoBanner title={copy.loadError} tone="amber" />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRefreshKey((value) => value + 1)}>
            {copy.retry}
          </button>
        </div>
      ) : null}

      {!listLoading && !listError && campaignList?.items.length === 0 ? (
        <p className={styles.empty}>{copy.empty}</p>
      ) : null}

      {campaignList?.items.length ? (
        <>
          <div className={styles.campaignStrip} role="list" aria-label={copy.title}>
            {campaignList.items.map((item) => {
              const active = item.id === selectedCampaignId;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="listitem"
                  className={[styles.campaignButton, active ? styles.campaignButtonActive : ''].filter(Boolean).join(' ')}
                  aria-pressed={active}
                  onClick={() => setSelectedCampaignId(item.id)}
                >
                  <span className={styles.campaignButtonTop}>
                    <strong dir="auto">{item.name}</strong>
                    <Badge tone={item.state === 'prepared' ? 'green' : 'slate'}>
                      {item.state === 'prepared' ? copy.prepared : item.state}
                    </Badge>
                  </span>
                  <span className={styles.campaignMeta}>
                    {copy.preparedAt}: {formatHistoricalDate(item.prepared_at ?? item.create_date, locale)}
                  </span>
                  <span className={styles.campaignCounts}>
                    <span>{copy.totalAudience}: <strong>{item.audience_summary.total}</strong></span>
                    <span>{copy.selected}: <strong>{item.audience_summary.selected}</strong></span>
                    <span>{copy.usedCampaignLink}: <strong>{item.activation_summary.activated_via_campaign_link}</strong></span>
                  </span>
                </button>
              );
            })}
          </div>

          {campaignList.pagination.pages > 1 ? (
            <div className={styles.pagination}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={page <= 1 || listLoading}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                {copy.previous}
              </button>
              <span>{page} / {campaignList.pagination.pages}</span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={page >= campaignList.pagination.pages || listLoading}
                onClick={() => setPage((value) => value + 1)}
              >
                {copy.next}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {selectedListItem ? (
        <div className={styles.selectedHeader}>
          <div>
            <h3 dir="auto">{selectedListItem.name}</h3>
            <p className="muted">
              {copy.createdAt}: {formatHistoricalDate(selectedListItem.create_date, locale)}
            </p>
          </div>
          <Badge tone="blue">#{selectedListItem.id}</Badge>
        </div>
      ) : null}

      {analyticsLoading ? <p className={styles.loading}>{copy.loading}</p> : null}
      {analyticsError ? <InfoBanner title={copy.analyticsError} tone="amber" /> : null}

      {analytics ? (
        <div className={styles.analytics}>
          <section className={styles.analyticsSection} aria-label={copy.audience}>
            <div className={styles.sectionHeading}>
              <h3>{copy.audience}</h3>
            </div>
            <div className={styles.statGrid}>
              <StatCard label={copy.totalAudience} value={analytics.audience_summary.total} tone="slate" />
              <StatCard label={copy.eligible} value={analytics.audience_summary.eligible} tone="green" />
              <StatCard label={copy.selected} value={analytics.audience_summary.selected} tone="blue" />
              <StatCard label={copy.excluded} value={analytics.audience_summary.excluded} tone="amber" />
            </div>
            {analytics.audience_summary.eligible_not_selected > 0 ? (
              <p className={styles.subtleLine}>
                {copy.eligibleNotSelected}: <strong>{analytics.audience_summary.eligible_not_selected}</strong>
              </p>
            ) : null}
          </section>

          <section className={styles.analyticsSection} aria-label={copy.messageStatus}>
            <div className={styles.sectionHeading}>
              <div>
                <h3>{copy.messageStatus}</h3>
                <p className="muted">{copy.messageScope}</p>
              </div>
              <Badge tone="slate">{analytics.message_summary.denominator}</Badge>
            </div>
            {!analytics.metadata.messaging_status_available ? (
              <InfoBanner title={copy.messageUnavailable} tone="amber" />
            ) : null}
            {!historicalMessageSummaryIsBalanced(analytics.message_summary) ? (
              <InfoBanner title={copy.messageUnavailable} tone="amber" />
            ) : null}
            <div className={styles.metricGrid}>
              {MESSAGE_STATUSES.map((status) => (
                <StatusMetric
                  key={status}
                  label={getHistoricalMessageStatusLabel(locale, status)}
                  value={analytics.message_summary[status]}
                  status={status}
                  onClick={() => openDrilldown({
                    kind: 'message',
                    status,
                    label: getHistoricalMessageStatusLabel(locale, status),
                  })}
                />
              ))}
            </div>
            <FreshnessLine
              label={copy.statusAsOf}
              value={analytics.metadata.status_as_of}
              locale={locale}
            />
          </section>

          <section className={styles.analyticsSection} aria-label={copy.activationStatus}>
            <div className={styles.sectionHeading}>
              <div>
                <h3>{copy.activationStatus}</h3>
                <p className="muted">{copy.activationScope}</p>
              </div>
            </div>
            <div className={styles.activationGrid}>
              {ACTIVATION_STATUSES.map((status) => (
                <StatusMetric
                  key={status}
                  label={getHistoricalActivationStatusLabel(locale, status)}
                  value={analytics.activation_summary[status]}
                  status={status}
                  onClick={() => openDrilldown({
                    kind: 'activation',
                    status,
                    label: getHistoricalActivationStatusLabel(locale, status),
                  })}
                />
              ))}
            </div>
            <FreshnessLine
              label={copy.activationAsOf}
              value={analytics.metadata.activation_as_of}
              locale={locale}
            />
          </section>

          <section className={styles.analyticsSection} aria-label={copy.funnel}>
            <div className={styles.sectionHeading}>
              <h3>{copy.funnel}</h3>
            </div>
            <div className={styles.flowGrid}>
              <FlowStep label={copy.totalAudience} value={analytics.funnel.audience_total} />
              <FlowArrow />
              <FlowStep label={copy.eligible} value={analytics.funnel.eligible} />
              <FlowArrow />
              <FlowStep label={copy.selected} value={analytics.funnel.selected} />
              <FlowArrow />
              <FlowStep label={copy.dispatchEnqueued} value={analytics.funnel.dispatch_enqueued} />
              <FlowArrow />
              <FlowStep label={copy.usedCampaignLink} value={analytics.funnel.activated_via_campaign_link} />
            </div>
          </section>

          {drilldown ? (
            <section className={styles.drilldown} aria-live="polite">
              <div className={styles.sectionHeading}>
                <div>
                  <h3>{drilldown.label}</h3>
                  <p className="muted">{copy.recipients}</p>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    setDrilldown(null);
                    setRecipientPage(null);
                    setRecipientError(false);
                  }}
                >
                  {copy.hideDetails}
                </button>
              </div>
              {recipientLoading ? <p className={styles.loading}>{copy.loading}</p> : null}
              {recipientError ? <InfoBanner title={copy.analyticsError} tone="amber" /> : null}
              {recipientPage && recipientPage.items.length === 0 ? (
                <p className={styles.empty}>{copy.noRecipients}</p>
              ) : null}
              {recipientPage?.items.length ? (
                <>
                  <div className={styles.recipientList}>
                    {recipientPage.items.map((recipient) => (
                      <Link
                        key={recipient.recipient_id}
                        href={'/admin/parents/' + recipient.parent_id}
                        className={styles.recipientRow}
                      >
                        <strong dir="auto">{recipient.parent_name}</strong>
                        <span>
                          {drilldown.kind === 'message' && recipient.message_status
                            ? getHistoricalMessageStatusLabel(locale, recipient.message_status)
                            : drilldown.kind === 'activation' && recipient.activation_status
                              ? getHistoricalActivationStatusLabel(locale, recipient.activation_status)
                              : '—'}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <p className={styles.subtleLine}>
                    {copy.showing}: {recipientPage.items.length} {copy.of} {recipientPage.pagination.total}
                  </p>
                </>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function StatusMetric({
  label,
  value,
  status,
  onClick,
}: {
  label: string;
  value: number;
  status: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.statusMetric}
      data-status={status}
      onClick={onClick}
      disabled={value <= 0}
      title={value > 0 ? label : undefined}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

function FlowStep({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.flowStep}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function FlowArrow() {
  return <span className={styles.flowArrow} aria-hidden="true">→</span>;
}

function FreshnessLine({ label, value, locale }: { label: string; value: string | null; locale: Locale }) {
  if (!value) return null;
  return <p className={styles.freshness}>{label}: {formatHistoricalDate(value, locale)}</p>;
}
