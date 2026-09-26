'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, InfoBanner } from '@/components/ui/primitives';
import { useLocale } from '@/features/i18n/locale-context';
import {
  formatHistoricalDate,
  getHistoricalActivationStatusLabel,
  getHistoricalMessageStatusLabel,
  getHistoricalMilestoneLabel,
  getParentActivationHistoricalCopy,
  historicalMessageSummaryIsBalanced,
  historicalMilestoneRate,
} from '@/features/parents/parent-activation-historical-analytics';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Locale } from '@/lib/i18n/config';
import type {
  ParentActivationHistoricalActivationStatus,
  ParentActivationHistoricalAnalytics,
  ParentActivationHistoricalCampaignList,
  ParentActivationHistoricalMessageStatus,
  ParentActivationHistoricalMilestone,
  ParentActivationHistoricalRecipient,
  ParentActivationHistoricalRecipientPage,
} from '@/types/parent-activation-campaign';
import styles from './historical-activation-campaigns.module.css';

const CURRENT_MESSAGE_STATUSES: ParentActivationHistoricalMessageStatus[] = [
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

type RecipientView =
  | { kind: 'milestone'; value: 'sent' | 'delivered' | 'read' | 'opened_activation_link' }
  | { kind: 'message'; value: 'failed' | 'not_sent' };

const DEFAULT_VIEW: RecipientView = { kind: 'milestone', value: 'sent' };

export function HistoricalActivationCampaigns() {
  const { locale } = useLocale();
  const copy = getParentActivationHistoricalCopy(locale);
  const [campaignPage, setCampaignPage] = useState(1);
  const [campaignList, setCampaignList] = useState<ParentActivationHistoricalCampaignList | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<ParentActivationHistoricalAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [recipientView, setRecipientView] = useState<RecipientView>(DEFAULT_VIEW);
  const [recipientPageNumber, setRecipientPageNumber] = useState(1);
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
      { page: campaignPage, limit: 10, sort: 'id_desc' },
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
      setSelectedCampaignId((current) => {
        if (current && response.data.items.some((item) => item.id === current)) return current;
        return response.data.items[0]?.id ?? null;
      });
    }).catch(() => {
      if (active) setListError(true);
    }).finally(() => {
      if (active) setListLoading(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [campaignPage, refreshKey]);

  useEffect(() => {
    if (!selectedCampaignId) {
      setAnalytics(null);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setAnalyticsLoading(true);
    setAnalyticsError(false);

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

  useEffect(() => {
    if (!selectedCampaignId || !analytics) {
      setRecipientPage(null);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setRecipientLoading(true);
    setRecipientError(false);

    const query = recipientView.kind === 'milestone'
      ? {
          page: recipientPageNumber,
          limit: 25,
          milestone: recipientView.value,
        }
      : {
          page: recipientPageNumber,
          limit: 25,
          message_status: recipientView.value,
        };

    api.get<ParentActivationHistoricalRecipientPage>(
      endpoints.admin.parentActivationCampaignRecipients(selectedCampaignId),
      query,
      { signal: controller.signal },
    ).then((response) => {
      if (!active) return;
      if (!response.success) {
        setRecipientError(true);
        setRecipientPage(null);
        return;
      }
      setRecipientPage(response.data);
    }).catch(() => {
      if (active) setRecipientError(true);
    }).finally(() => {
      if (active) setRecipientLoading(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCampaignId, analytics, recipientView, recipientPageNumber, refreshKey]);

  const selectedListItem = useMemo(
    () => campaignList?.items.find((item) => item.id === selectedCampaignId) ?? null,
    [campaignList, selectedCampaignId],
  );

  function chooseCampaign(id: number) {
    setSelectedCampaignId(id);
    setRecipientView(DEFAULT_VIEW);
    setRecipientPageNumber(1);
  }

  function chooseView(view: RecipientView) {
    setRecipientView(view);
    setRecipientPageNumber(1);
  }

  return (
    <Card className={styles.historyCard}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{copy.campaignOverview}</p>
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
      </header>

      {listError ? (
        <div className={styles.errorBlock}>
          <InfoBanner title={copy.loadError} tone="amber" />
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            {copy.retry}
          </button>
        </div>
      ) : null}

      {!listLoading && !listError && campaignList?.items.length === 0 ? (
        <p className={styles.empty}>{copy.empty}</p>
      ) : null}

      <section className={styles.campaignPicker} aria-label={copy.selectCampaign}>
        <div className={styles.pickerHeader}>
          <div>
            <p className={styles.eyebrow}>{copy.selectCampaign}</p>
            <div className={styles.pickerTitleLine}>
              <strong>{copy.selectCampaign}</strong>
              <span>{campaignList?.pagination.total ?? 0}</span>
            </div>
          </div>

          {campaignList && campaignList.pagination.pages > 1 ? (
            <div className={styles.pickerPagination}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={campaignPage <= 1 || listLoading}
                onClick={() => setCampaignPage((value) => Math.max(1, value - 1))}
              >
                {copy.previous}
              </button>
              <span>{campaignPage} / {campaignList.pagination.pages}</span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={campaignPage >= campaignList.pagination.pages || listLoading}
                onClick={() => setCampaignPage((value) => value + 1)}
              >
                {copy.next}
              </button>
            </div>
          ) : null}
        </div>

        {listLoading ? <p className={styles.loading}>{copy.loading}</p> : null}

        {!listLoading && campaignList?.items.length ? (
          <select
            className={styles.campaignSelect}
            value={selectedCampaignId ?? ''}
            onChange={(event) => chooseCampaign(Number(event.target.value))}
            aria-label={copy.selectCampaign}
          >
            {campaignList.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — #{item.id}
              </option>
            ))}
          </select>
        ) : null}

        {selectedListItem ? (
          <div className={styles.campaignSummaryBar}>
            <div className={styles.campaignSummaryMain}>
              <div className={styles.campaignSummaryTitle}>
                <strong dir="auto">{selectedListItem.name}</strong>
                <Badge tone={selectedListItem.state === 'prepared' ? 'green' : 'slate'}>
                  {selectedListItem.state === 'prepared' ? copy.prepared : selectedListItem.state}
                </Badge>
              </div>
              <span>{formatHistoricalDate(selectedListItem.prepared_at ?? selectedListItem.create_date, locale)}</span>
            </div>

            <div className={styles.campaignSummaryStats}>
              <span>{copy.selected}<strong>{selectedListItem.audience_summary.selected}</strong></span>
              <span>{copy.usedCampaignLink}<strong>{selectedListItem.activation_summary.activated_via_campaign_link}</strong></span>
            </div>
          </div>
        ) : null}
      </section>

      <main className={styles.detailPane}>
          {selectedListItem ? (
            <div className={styles.selectedHeader}>
              <div>
                <div className={styles.selectedTitleLine}>
                  <h3 dir="auto">{selectedListItem.name}</h3>
                  <Badge tone="blue">#{selectedListItem.id}</Badge>
                </div>
                <p className="muted">
                  {copy.preparedAt}: {formatHistoricalDate(selectedListItem.prepared_at ?? selectedListItem.create_date, locale)}
                </p>
              </div>
              <div className={styles.audiencePills}>
                <span>{copy.totalAudience}<strong>{selectedListItem.audience_summary.total}</strong></span>
                <span>{copy.selected}<strong>{selectedListItem.audience_summary.selected}</strong></span>
                <span>{copy.excluded}<strong>{selectedListItem.audience_summary.excluded}</strong></span>
              </div>
            </div>
          ) : null}

          {analyticsLoading ? <p className={styles.loading}>{copy.loading}</p> : null}
          {analyticsError ? <InfoBanner title={copy.analyticsError} tone="amber" /> : null}

          {analytics ? (
            <>
              <section className={styles.performanceSection} aria-label={copy.campaignPerformance}>
                <div className={styles.sectionHeading}>
                  <div>
                    <p className={styles.eyebrow}>{copy.campaignPerformance}</p>
                    <h3>{copy.messageStatus}</h3>
                    <p className="muted">{copy.cumulativeHint}</p>
                  </div>
                  <div className={styles.denominator}>
                    <span>{copy.selectedAudience}</span>
                    <strong>{analytics.milestone_summary.denominator}</strong>
                  </div>
                </div>

                {analytics.milestone_summary.status_unavailable > 0 ? (
                  <InfoBanner title={copy.milestoneUnavailable} tone="amber" />
                ) : null}

                <div className={styles.milestoneGrid}>
                  <MilestoneCard
                    label={copy.sentTo}
                    value={analytics.milestone_summary.sent}
                    rate={historicalMilestoneRate(analytics.milestone_summary, 'sent')}
                    rateLabel={copy.rateOfSelected}
                    active={recipientView.kind === 'milestone' && recipientView.value === 'sent'}
                    status="sent"
                    onClick={() => chooseView({ kind: 'milestone', value: 'sent' })}
                  />
                  <MilestoneCard
                    label={copy.deliveredTo}
                    value={analytics.milestone_summary.delivered}
                    rate={historicalMilestoneRate(analytics.milestone_summary, 'delivered')}
                    rateLabel={copy.rateOfSelected}
                    active={recipientView.kind === 'milestone' && recipientView.value === 'delivered'}
                    status="delivered"
                    onClick={() => chooseView({ kind: 'milestone', value: 'delivered' })}
                  />
                  <MilestoneCard
                    label={copy.readBy}
                    value={analytics.milestone_summary.read}
                    rate={historicalMilestoneRate(analytics.milestone_summary, 'read')}
                    rateLabel={copy.rateOfSelected}
                    active={recipientView.kind === 'milestone' && recipientView.value === 'read'}
                    status="read"
                    onClick={() => chooseView({ kind: 'milestone', value: 'read' })}
                  />
                  <MilestoneCard
                    label={copy.openedLink}
                    value={analytics.milestone_summary.opened_activation_link}
                    rate={historicalMilestoneRate(analytics.milestone_summary, 'opened_activation_link')}
                    rateLabel={copy.rateOfSelected}
                    active={recipientView.kind === 'milestone' && recipientView.value === 'opened_activation_link'}
                    status="opened_activation_link"
                    onClick={() => chooseView({ kind: 'milestone', value: 'opened_activation_link' })}
                  />
                </div>

                <div className={styles.journey} aria-label={copy.funnel}>
                  {(['sent', 'delivered', 'read', 'opened_activation_link'] as const).map((milestone, index) => (
                    <div className={styles.journeyItem} key={milestone}>
                      {index > 0 ? <span className={styles.journeyLine} aria-hidden="true" /> : null}
                      <span className={styles.journeyDot} />
                      <strong>{analytics.milestone_summary[milestone]}</strong>
                      <span>{getHistoricalMilestoneLabel(locale, milestone)}</span>
                    </div>
                  ))}
                </div>

                <FreshnessLine label={copy.statusAsOf} value={analytics.metadata.status_as_of} locale={locale} />
              </section>

              <section className={styles.recipientSection}>
                <div className={styles.sectionHeading}>
                  <div>
                    <p className={styles.eyebrow}>{copy.recipientResults}</p>
                    <h3>{getRecipientViewLabel(locale, recipientView)}</h3>
                  </div>
                  <Badge tone="slate">{recipientPage?.pagination.total ?? 0}</Badge>
                </div>

                <div className={styles.tabs} role="tablist" aria-label={copy.recipientResults}>
                  <RecipientTab
                    label={copy.sentTo}
                    count={analytics.milestone_summary.sent}
                    active={recipientView.kind === 'milestone' && recipientView.value === 'sent'}
                    onClick={() => chooseView({ kind: 'milestone', value: 'sent' })}
                  />
                  <RecipientTab
                    label={copy.deliveredTo}
                    count={analytics.milestone_summary.delivered}
                    active={recipientView.kind === 'milestone' && recipientView.value === 'delivered'}
                    onClick={() => chooseView({ kind: 'milestone', value: 'delivered' })}
                  />
                  <RecipientTab
                    label={copy.readBy}
                    count={analytics.milestone_summary.read}
                    active={recipientView.kind === 'milestone' && recipientView.value === 'read'}
                    onClick={() => chooseView({ kind: 'milestone', value: 'read' })}
                  />
                  <RecipientTab
                    label={copy.openedLink}
                    count={analytics.milestone_summary.opened_activation_link}
                    active={recipientView.kind === 'milestone' && recipientView.value === 'opened_activation_link'}
                    onClick={() => chooseView({ kind: 'milestone', value: 'opened_activation_link' })}
                  />
                  <RecipientTab
                    label={copy.failedNow}
                    count={analytics.message_summary.failed}
                    active={recipientView.kind === 'message' && recipientView.value === 'failed'}
                    onClick={() => chooseView({ kind: 'message', value: 'failed' })}
                  />
                  <RecipientTab
                    label={copy.notSentYet}
                    count={analytics.message_summary.not_sent}
                    active={recipientView.kind === 'message' && recipientView.value === 'not_sent'}
                    onClick={() => chooseView({ kind: 'message', value: 'not_sent' })}
                  />
                </div>

                {recipientLoading ? <p className={styles.loading}>{copy.loading}</p> : null}
                {recipientError ? <InfoBanner title={copy.analyticsError} tone="amber" /> : null}
                {recipientPage && recipientPage.items.length === 0 ? (
                  <p className={styles.empty}>{copy.noRecipients}</p>
                ) : null}

                {recipientPage?.items.length ? (
                  <div className={styles.tableWrap}>
                    <table className={styles.recipientTable}>
                      <thead>
                        <tr>
                          <th>{copy.recipients}</th>
                          <th>{copy.currentMessageState}</th>
                          <th>{copy.milestoneReachedAt}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipientPage.items.map((recipient) => (
                          <RecipientRow
                            key={recipient.recipient_id}
                            recipient={recipient}
                            view={recipientView}
                            locale={locale}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {recipientPage && recipientPage.pagination.pages > 1 ? (
                  <div className={styles.tablePagination}>
                    <span>
                      {copy.showing}: {recipientPage.items.length} {copy.of} {recipientPage.pagination.total}
                    </span>
                    <div>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={recipientPageNumber <= 1 || recipientLoading}
                        onClick={() => setRecipientPageNumber((value) => Math.max(1, value - 1))}
                      >
                        {copy.previous}
                      </button>
                      <span>{recipientPageNumber} / {recipientPage.pagination.pages}</span>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={recipientPageNumber >= recipientPage.pagination.pages || recipientLoading}
                        onClick={() => setRecipientPageNumber((value) => value + 1)}
                      >
                        {copy.next}
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>

              <details className={styles.diagnostics}>
                <summary>{copy.technicalStates}</summary>
                {!analytics.metadata.messaging_status_available ? (
                  <InfoBanner title={copy.messageUnavailable} tone="amber" />
                ) : null}
                {!historicalMessageSummaryIsBalanced(analytics.message_summary) ? (
                  <InfoBanner title={copy.messageUnavailable} tone="amber" />
                ) : null}

                <div className={styles.diagnosticGroup}>
                  <h4>{copy.messageStatus}</h4>
                  <div className={styles.diagnosticGrid}>
                    {CURRENT_MESSAGE_STATUSES.map((status) => (
                      <DiagnosticMetric
                        key={status}
                        label={getHistoricalMessageStatusLabel(locale, status)}
                        value={analytics.message_summary[status]}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.diagnosticGroup}>
                  <h4>{copy.activationStatus}</h4>
                  <div className={styles.diagnosticGrid}>
                    {ACTIVATION_STATUSES.map((status) => (
                      <DiagnosticMetric
                        key={status}
                        label={getHistoricalActivationStatusLabel(locale, status)}
                        value={analytics.activation_summary[status]}
                      />
                    ))}
                  </div>
                </div>
              </details>
            </>
          ) : null}
      </main>
    </Card>
  );
}

function MilestoneCard({
  label,
  value,
  rate,
  rateLabel,
  active,
  status,
  onClick,
}: {
  label: string;
  value: number;
  rate: number;
  rateLabel: string;
  active: boolean;
  status: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[styles.milestoneCard, active ? styles.milestoneCardActive : ''].filter(Boolean).join(' ')}
      data-status={status}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className={styles.milestoneLabel}>{label}</span>
      <strong>{value}</strong>
      <span className={styles.milestoneRate}>{rate}% {rateLabel}</span>
    </button>
  );
}

function RecipientTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={[styles.tab, active ? styles.tabActive : ''].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <span>{label}</span>
      <b>{count}</b>
    </button>
  );
}

function RecipientRow({
  recipient,
  view,
  locale,
}: {
  recipient: ParentActivationHistoricalRecipient;
  view: RecipientView;
  locale: Locale;
}) {
  const statusLabel = recipient.message_status
    ? getHistoricalMessageStatusLabel(locale, recipient.message_status)
    : '—';

  return (
    <tr>
      <td>
        <Link href={'/admin/parents/' + recipient.parent_id} className={styles.parentLink}>
          <strong dir="auto">{recipient.parent_name}</strong>
          <span>#{recipient.parent_id}</span>
        </Link>
      </td>
      <td>
        <span className={styles.currentStatus} data-status={recipient.message_status ?? 'unknown'}>
          {statusLabel}
        </span>
      </td>
      <td>
        {formatHistoricalDate(getRecipientViewTimestamp(recipient, view), locale)}
      </td>
    </tr>
  );
}

function DiagnosticMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.diagnosticMetric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getRecipientViewLabel(locale: Locale, view: RecipientView): string {
  if (view.kind === 'milestone') return getHistoricalMilestoneLabel(locale, view.value);
  return getHistoricalMessageStatusLabel(locale, view.value);
}

function getRecipientViewTimestamp(
  recipient: ParentActivationHistoricalRecipient,
  view: RecipientView,
): string | null {
  if (view.kind !== 'milestone' || !recipient.milestone_timestamps) return null;
  switch (view.value) {
    case 'sent':
      return recipient.milestone_timestamps.sent_at;
    case 'delivered':
      return recipient.milestone_timestamps.delivered_at;
    case 'read':
      return recipient.milestone_timestamps.read_at;
    case 'opened_activation_link':
      return recipient.milestone_timestamps.opened_activation_link_at;
    default:
      return null;
  }
}

function FreshnessLine({
  label,
  value,
  locale,
}: {
  label: string;
  value: string | null;
  locale: Locale;
}) {
  if (!value) return null;
  return <p className={styles.freshness}>{label}: {formatHistoricalDate(value, locale)}</p>;
}
