'use client';

/** @raqeem-design docs/design/RAQEEM-DESIGN.md @design-status adopted */
import Link from 'next/link';
import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Badge, Card, InfoBanner, PageHeader, StatCard } from '@/components/ui/primitives';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useLocale } from '@/features/i18n/locale-context';
import { getParentActivationExclusionLabel } from '@/features/parents/parent-activation-exclusion-reason';
import {
  buildParentActivationDispatchBody,
  getParentActivationDispatchCopy,
  getParentActivationDispatchFailureLabel,
  getParentActivationDispatchStatusMeta,
  summarizeParentActivationDispatch,
} from '@/features/parents/parent-activation-dispatch';
import {
  EMPTY_PARENT_ACTIVATION_FILTERS,
  buildBulkSelectionBody,
  canDispatchSelected,
  filterParentActivationRecipients,
  getBulkSelectionRejectedLabel,
  getMessagingStatusMeta,
  getParentActivationOperationsCopy,
  getParentActivationOperationsUiCopy,
  getSelectionStatusMeta,
  recipientIsActivated,
  type ParentActivationRecipientFilters,
} from '@/features/parents/parent-activation-operations';
import type {
  ParentActivationBulkSelectionResult,
  ParentActivationCampaign,
  ParentActivationCampaignDispatch,
  ParentActivationCampaignRecipient,
  ParentActivationMessagingCounts,
} from '@/types/parent-activation-campaign';
import { HistoricalActivationCampaigns } from './historical-activation-campaigns';
import styles from './activation-campaign.module.css';

const EMPTY_MESSAGING_COUNTS: ParentActivationMessagingCounts = {
  not_dispatched: 0,
  queued: 0,
  processing: 0,
  sent: 0,
  delivered: 0,
  read: 0,
  failed: 0,
  status_unavailable: 0,
  status_not_found: 0,
  contract_mismatch: 0,
};

export default function ParentActivationCampaignPage() {
  const { locale, t } = useLocale();
  const dispatchCopy = getParentActivationDispatchCopy(locale);
  const statusCopy = getParentActivationOperationsCopy(locale);
  const ui = getParentActivationOperationsUiCopy(locale);
  const [name, setName] = useState('');
  const [campaign, setCampaign] = useState<ParentActivationCampaign | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ParentActivationRecipientFilters>(EMPTY_PARENT_ACTIVATION_FILTERS);
  const [markedRecipientIds, setMarkedRecipientIds] = useState<Set<number>>(new Set());
  const [rowPendingId, setRowPendingId] = useState<number | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'initial' | 'retry'>('initial');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchResult, setDispatchResult] = useState<ParentActivationCampaignDispatch | null>(null);

  const filteredRecipients = useMemo(
    () => campaign ? filterParentActivationRecipients(campaign.recipients, filters, campaign.messaging_status_available !== false) : [],
    [campaign, filters],
  );
  const resultSummary = useMemo(
    () => dispatchResult ? summarizeParentActivationDispatch(dispatchResult) : null,
    [dispatchResult],
  );
  const previouslyContactedCount = useMemo(
    () => campaign?.recipients.filter((recipient) => recipient.contact_attempted_at_prepare).length ?? 0,
    [campaign],
  );
  const messagingCounts = campaign?.messaging_counts ?? EMPTY_MESSAGING_COUNTS;
  const selectedForDispatch = campaign?.selection_counts.selected_for_dispatch ?? 0;
  const busy = submitting || dispatching || bulkPending || rowPendingId !== null;
  const canDispatch = campaign
    ? canDispatchSelected(selectedForDispatch, submitting || bulkPending || rowPendingId !== null, dispatching)
    : false;
  const confirmIsRetry = confirmMode === 'retry' && Boolean(resultSummary?.failed);

  async function refreshCampaign(campaignId: number): Promise<ParentActivationCampaign | null> {
    const refreshed = await api.get<ParentActivationCampaign>(
      endpoints.admin.parentActivationCampaign(campaignId),
    );
    if (!refreshed.success) return null;
    setCampaign(refreshed.data);
    return refreshed.data;
  }

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || dispatching || bulkPending) return;

    setSubmitting(true);
    setError(null);
    setSelectionError(null);
    setBulkNotice(null);
    setDispatchError(null);
    setDispatchResult(null);
    setConfirmOpen(false);
    setMarkedRecipientIds(new Set());

    const response = await api.post<ParentActivationCampaign>(
      endpoints.admin.parentActivationCampaignPrepare,
      name.trim() ? { name: name.trim() } : {},
    );

    if (!response.success) {
      setSubmitting(false);
      setError(response.error.message);
      return;
    }

    const enriched = await refreshCampaign(response.data.id);
    if (!enriched) setCampaign(response.data);
    setSubmitting(false);
  }

  async function updateRecipientSelection(
    recipient: ParentActivationCampaignRecipient,
    selectedForSend: boolean,
  ) {
    if (!campaign || submitting || dispatching || bulkPending || rowPendingId !== null) return;
    if (!recipient.eligible_for_send && selectedForSend) return;

    setRowPendingId(recipient.recipient_id);
    setSelectionError(null);
    setBulkNotice(null);
    const response = await api.patch<ParentActivationCampaignRecipient>(
      endpoints.admin.parentActivationCampaignRecipientSelection(campaign.id, recipient.recipient_id),
      { selected_for_send: selectedForSend },
    );
    if (!response.success) {
      setSelectionError(ui.selectionFailed);
      setRowPendingId(null);
      return;
    }
    await refreshCampaign(campaign.id);
    setRowPendingId(null);
  }

  async function applyBulkSelection(selectedForSend: boolean) {
    if (!campaign || markedRecipientIds.size === 0 || busy) return;
    setBulkPending(true);
    setSelectionError(null);
    setBulkNotice(null);
    const body = buildBulkSelectionBody(Array.from(markedRecipientIds), selectedForSend);
    const response = await api.post<ParentActivationBulkSelectionResult>(
      endpoints.admin.parentActivationCampaignBulkSelection(campaign.id),
      body,
    );
    if (!response.success) {
      setSelectionError(ui.bulkFailed);
      setBulkPending(false);
      return;
    }
    const updated = response.data.updated.length;
    const rejected = response.data.rejected.length;
    const rejectedReason = response.data.rejected[0]?.reason_code;
    setBulkNotice(
      rejected > 0
        ? `${ui.bulkUpdated}: ${updated}. ${ui.bulkRejected}: ${rejected}. ${getBulkSelectionRejectedLabel(locale, rejectedReason ?? '')}`
        : `${ui.bulkUpdated}: ${updated}.`,
    );
    setMarkedRecipientIds(new Set());
    await refreshCampaign(campaign.id);
    setBulkPending(false);
  }

  function toggleMarked(recipientId: number) {
    if (busy) return;
    setMarkedRecipientIds((current) => {
      const next = new Set(current);
      if (next.has(recipientId)) next.delete(recipientId);
      else next.add(recipientId);
      return next;
    });
  }

  function markVisibleResults() {
    if (busy) return;
    setMarkedRecipientIds(new Set(filteredRecipients.map((recipient) => recipient.recipient_id)));
  }

  function updateFilter<K extends keyof ParentActivationRecipientFilters>(
    key: K,
    value: ParentActivationRecipientFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function openDispatchConfirmation(mode: 'initial' | 'retry') {
    if (!campaign || !canDispatch) return;
    setConfirmMode(mode);
    setConfirmOpen(true);
    setDispatchError(null);
  }

  async function dispatchCampaign() {
    if (!campaign || !canDispatch) return;

    setDispatching(true);
    setDispatchError(null);
    const response = await api.post<ParentActivationCampaignDispatch>(
      `${endpoints.admin.parentActivationCampaign(campaign.id)}/dispatch`,
      buildParentActivationDispatchBody(),
    );
    setConfirmOpen(false);

    if (!response.success) {
      setDispatchError(dispatchCopy.dispatchRequestFailed);
      setDispatching(false);
      return;
    }

    setDispatchResult(response.data);
    await refreshCampaign(campaign.id);
    setDispatching(false);
  }

  return (
    <div className={`page-shell ${styles.campaignFlow}`}>
      <PageHeader
        title={t('admin.parentActivation.title')}
        subtitle={t('admin.parentActivation.subtitle')}
        actions={
          <Link href="/admin/parents" className="btn btn--ghost btn--sm">
            {t('admin.parentActivation.backToParents')}
          </Link>
        }
      />

      <HistoricalActivationCampaigns />

      <InfoBanner
        title={dispatchCopy.previewSafetyTitle}
        description={dispatchCopy.previewSafetyDescription}
        tone="amber"
      />

      <Card className={styles.previewCard}>
        <div className={styles.cardHeadingRow}>
          <div>
            <h2>{t('admin.parentActivation.stepOneTitle')}</h2>
            <p className="muted">{t('admin.parentActivation.stepOneDescription')}</p>
          </div>
          {campaign?.prepared_at ? (
            <span className={styles.preparedAt}>{ui.preparedAt}: {formatDateTime(campaign.prepared_at, locale)}</span>
          ) : null}
        </div>
        <form onSubmit={prepare} className={styles.previewForm}>
          <label className="field">
            <span className="field__label">{t('admin.parentActivation.nameLabel')}</span>
            <input
              value={name}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
              maxLength={160}
              disabled={busy}
            />
          </label>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {submitting ? t('admin.parentActivation.preparing') : ui.refreshList}
          </button>
        </form>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </Card>

      {campaign ? (
        <section className={styles.reviewSection} aria-live="polite">
          <div className={styles.reviewHeading}>
            <div className={styles.reviewHeadingText}>
              <h2>{ui.operationsTitle}</h2>
              <p className="muted">{campaign.name}</p>
            </div>
            <Badge tone="blue">{t('admin.parentActivation.prepared')}</Badge>
          </div>

          <section aria-label={ui.eligibility} className={styles.summarySection}>
            <div className={styles.summaryTitle}>{ui.eligibility}</div>
            <div className={styles.statGrid}>
              <StatCard label={ui.audience} value={campaign.counts.total} tone="slate" />
              <StatCard label={ui.eligibleCount} value={campaign.counts.ready} tone="green" />
              <StatCard label={ui.ineligibleCount} value={campaign.counts.excluded} tone="amber" />
            </div>
          </section>

          <section aria-label={ui.selection} className={styles.summarySection}>
            <div className={styles.summaryTitle}>{ui.selection}</div>
            <div className={styles.statGridFour}>
              <StatCard label={ui.selectedForDispatch} value={selectedForDispatch} tone="green" />
              <StatCard
                label={ui.defaultExcluded}
                value={campaign.selection_counts.default_excluded_previously_contacted}
                tone="amber"
              />
              <StatCard label={ui.manuallyExcluded} value={campaign.selection_counts.manually_excluded} tone="amber" />
              <StatCard label={ui.manuallyIncluded} value={campaign.selection_counts.manually_included} tone="blue" />
            </div>
          </section>

          <section aria-label={ui.messageStatus} className={styles.summarySection}>
            <div className={styles.summaryTitle}>{ui.messageStatus}</div>
            {!campaign.messaging_status_available ? (
              <InfoBanner title={ui.messagingUnavailable} tone="amber" />
            ) : null}
            <div className={styles.messagingGrid}>
              <MiniMetric label={statusCopy.notDispatched} value={messagingCounts.not_dispatched} />
              <MiniMetric label={statusCopy.queued} value={messagingCounts.queued} />
              <MiniMetric label={statusCopy.processing} value={messagingCounts.processing} />
              <MiniMetric label={statusCopy.sent} value={messagingCounts.sent} />
              <MiniMetric label={statusCopy.delivered} value={messagingCounts.delivered} />
              <MiniMetric label={statusCopy.read} value={messagingCounts.read} />
              <MiniMetric label={statusCopy.failed} value={messagingCounts.failed} />
              <MiniMetric
                label={statusCopy.unavailable}
                value={messagingCounts.status_unavailable + messagingCounts.status_not_found + messagingCounts.contract_mismatch}
              />
            </div>
          </section>

          <Card className={styles.recipientCard}>
            <div className={styles.filterHeader}>
              <div>
                <h3>{ui.filtersTitle}</h3>
                <p className="muted">{filteredRecipients.length} / {campaign.recipients.length}</p>
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setFilters(EMPTY_PARENT_ACTIVATION_FILTERS)}
                disabled={busy}
              >
                {ui.clearFilters}
              </button>
            </div>

            <div className={styles.filterGrid}>
              <label className="field">
                <span className="field__label">{ui.recipients}</span>
                <input
                  dir="auto"
                  type="search"
                  value={filters.query}
                  placeholder={ui.searchPlaceholder}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateFilter('query', event.target.value)}
                />
              </label>
              <FilterSelect label={ui.eligibility} value={filters.eligibility} onChange={(value) => updateFilter('eligibility', value as ParentActivationRecipientFilters['eligibility'])} options={[
                ['all', ui.all], ['eligible', ui.eligible], ['ineligible', ui.ineligible],
              ]} />
              <FilterSelect label={ui.selection} value={filters.selection} onChange={(value) => updateFilter('selection', value as ParentActivationRecipientFilters['selection'])} options={[
                ['all', ui.all], ['selected', ui.selected], ['excluded', ui.excluded],
              ]} />
              <FilterSelect label={ui.selectionSource} value={filters.selectionSource} onChange={(value) => updateFilter('selectionSource', value as ParentActivationRecipientFilters['selectionSource'])} options={[
                ['all', ui.all],
                ['automatic_default', statusCopy.autoSelected],
                ['default_excluded_previously_contacted', statusCopy.defaultExcluded],
                ['manual_include', statusCopy.manuallyIncluded],
                ['manual_exclude', statusCopy.manuallyExcluded],
                ['hard_ineligible', statusCopy.hardIneligible],
                ['legacy_existing_campaign', statusCopy.legacy],
              ]} />
              <FilterSelect label={ui.previousContact} value={filters.contact} onChange={(value) => updateFilter('contact', value as ParentActivationRecipientFilters['contact'])} options={[
                ['all', ui.all], ['contacted', ui.contacted], ['not_contacted', ui.notContacted],
              ]} />
              <FilterSelect label={ui.messageStatus} value={filters.messaging} onChange={(value) => updateFilter('messaging', value as ParentActivationRecipientFilters['messaging'])} options={[
                ['all', ui.all], ['not_dispatched', statusCopy.notDispatched], ['queued', statusCopy.queued], ['processing', statusCopy.processing], ['sent', statusCopy.sent], ['delivered', statusCopy.delivered], ['read', statusCopy.read], ['failed', statusCopy.failed], ['status_unavailable', statusCopy.unavailable],
              ]} />
              <FilterSelect label={ui.activation} value={filters.activation} onChange={(value) => updateFilter('activation', value as ParentActivationRecipientFilters['activation'])} options={[
                ['all', ui.all], ['activated', ui.activated], ['not_activated', ui.notActivated],
              ]} />
            </div>

            <div className={styles.presetBar} aria-label={ui.presets}>
              <span className={styles.presetLabel}>{ui.presets}</span>
              {([
                ['first_send_ready', ui.firstSend],
                ['contacted_not_activated', ui.contactedNotActivated],
                ['read_not_activated', ui.readNotActivated],
                ['failed', ui.failed],
                ['needs_remediation', ui.needsRemediation],
                ['manually_excluded', ui.manuallyExcluded],
                ['manually_included', ui.manuallyIncluded],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.presetButton} ${filters.preset === value ? styles.presetButtonActive : ''}`}
                  aria-pressed={filters.preset === value}
                  onClick={() => updateFilter('preset', filters.preset === value ? 'none' : value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={styles.bulkToolbar}>
              <div className={styles.bulkMarking}>
                <strong>{ui.marked}: {markedRecipientIds.size}</strong>
                <button type="button" className="btn btn--ghost btn--sm" onClick={markVisibleResults} disabled={busy || filteredRecipients.length === 0}>
                  {ui.markVisible}
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setMarkedRecipientIds(new Set())} disabled={busy || markedRecipientIds.size === 0}>
                  {ui.clearMarked}
                </button>
              </div>
              <div className={styles.bulkActions}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => applyBulkSelection(true)} disabled={busy || markedRecipientIds.size === 0}>
                  {ui.includeMarked}
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => applyBulkSelection(false)} disabled={busy || markedRecipientIds.size === 0}>
                  {ui.excludeMarked}
                </button>
              </div>
            </div>

            {selectionError ? <p className="form-error" role="alert">{selectionError}</p> : null}
            {bulkNotice ? <p className={styles.successMessage} role="status">{bulkNotice}</p> : null}

            {campaign.recipients.length === 0 ? (
              <p className={styles.emptyState}>{t('admin.parentActivation.noRecipients')}</p>
            ) : filteredRecipients.length === 0 ? (
              <p className={styles.emptyState}>{ui.noMatch}</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.recipientTable}>
                  <thead>
                    <tr>
                      <th><span className="sr-only">{ui.marked}</span></th>
                      <th>{ui.recipients}</th>
                      <th>{ui.eligibility}</th>
                      <th>{ui.selection}</th>
                      <th>{ui.previousContact}</th>
                      <th>{ui.messageStatus}</th>
                      <th>{ui.activation}</th>
                      <th>{ui.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecipients.map((recipient) => {
                      const exclusionLabel = getParentActivationExclusionLabel(locale, t, recipient.exclusion_reason);
                      const selectionMeta = getSelectionStatusMeta(locale, recipient);
                      const messagingMeta = getMessagingStatusMeta(locale, recipient, campaign.messaging_status_available !== false);
                      const activated = recipientIsActivated(recipient);
                      const pending = rowPendingId === recipient.recipient_id;
                      return (
                        <tr key={recipient.recipient_id}>
                          <td data-label={ui.marked}>
                            <input
                              type="checkbox"
                              checked={markedRecipientIds.has(recipient.recipient_id)}
                              onChange={() => toggleMarked(recipient.recipient_id)}
                              disabled={busy}
                              aria-label={`${ui.marked}: ${recipient.parent_name}`}
                            />
                          </td>
                          <td data-label={ui.recipients}>
                            <Link href={`/admin/parents/${recipient.parent_id}`} dir="auto" className={styles.parentLink}>
                              {recipient.parent_name}
                            </Link>
                          </td>
                          <td data-label={ui.eligibility}>
                            <Badge tone={recipient.eligible_for_send ? 'green' : 'amber'}>
                              {recipient.eligible_for_send ? ui.eligible : ui.ineligible}
                            </Badge>
                            {exclusionLabel ? <div className={styles.cellHint}>{exclusionLabel}</div> : null}
                          </td>
                          <td data-label={ui.selection}>
                            <Badge tone={selectionMeta.tone}>{selectionMeta.label}</Badge>
                          </td>
                          <td data-label={ui.previousContact}>
                            <span>{recipient.contact_attempted_at_prepare ? statusCopy.previouslyContacted : statusCopy.notPreviouslyContacted}</span>
                            {recipient.contact_last_dispatched_at_prepare ? (
                              <div className={styles.cellHint}>{formatDateTime(recipient.contact_last_dispatched_at_prepare, locale)}</div>
                            ) : null}
                          </td>
                          <td data-label={ui.messageStatus}>
                            <Badge tone={messagingMeta.tone}>{messagingMeta.label}</Badge>
                          </td>
                          <td data-label={ui.activation}>
                            <Badge tone={activated ? 'green' : 'slate'}>
                              {activated ? statusCopy.activated : statusCopy.notActivated}
                            </Badge>
                          </td>
                          <td data-label={ui.action}>
                            {recipient.eligible_for_send ? (
                              <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                aria-pressed={recipient.selected_for_send}
                                disabled={busy || pending || rowPendingId !== null}
                                onClick={() => updateRecipientSelection(recipient, !recipient.selected_for_send)}
                              >
                                {pending ? ui.processing : recipient.selected_for_send ? ui.exclude : ui.include}
                              </button>
                            ) : (
                              <Link className="btn btn--ghost btn--sm" href={`/admin/parents/${recipient.parent_id}`}>
                                {ui.remediation}
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className={styles.dispatchCard}>
            <div className={styles.dispatchHeader}>
              <div>
                <h2>{dispatchCopy.dispatchStepTitle}</h2>
                <p className="muted">{dispatchCopy.dispatchStepDescription}</p>
              </div>
              <Badge tone={selectedForDispatch > 0 ? 'green' : 'amber'}>
                {ui.selectedForDispatch}: {selectedForDispatch}
              </Badge>
            </div>

            <div className={styles.finalSummaryGrid}>
              <MiniMetric label={ui.audience} value={campaign.counts.total} />
              <MiniMetric label={ui.eligibleCount} value={campaign.counts.ready} />
              <MiniMetric label={ui.ineligibleCount} value={campaign.counts.excluded} />
              <MiniMetric label={statusCopy.previouslyContacted} value={previouslyContactedCount} />
              <MiniMetric label={ui.defaultExcluded} value={campaign.selection_counts.default_excluded_previously_contacted} />
              <MiniMetric label={ui.manuallyExcluded} value={campaign.selection_counts.manually_excluded} />
              <MiniMetric label={ui.manuallyIncluded} value={campaign.selection_counts.manually_included} />
              <MiniMetric label={ui.selectedForDispatch} value={selectedForDispatch} emphasize />
            </div>

            {selectedForDispatch === 0 ? (
              <InfoBanner title={ui.noSelected} description={dispatchCopy.confirmRevalidation} tone="amber" />
            ) : null}
            {dispatchError ? <p className="form-error" role="alert">{dispatchError}</p> : null}

            <div className={styles.dispatchAction}>
              <span className={styles.dispatchHint}>{dispatchCopy.confirmRevalidation}</span>
              <button
                type="button"
                className={`btn btn--primary ${styles.primaryAction}`}
                disabled={!canDispatch}
                onClick={() => openDispatchConfirmation('initial')}
              >
                {dispatching ? dispatchCopy.sending : `${ui.sendCampaign} (${selectedForDispatch})`}
              </button>
            </div>
          </Card>

          {dispatchResult && resultSummary ? (
            <Card className={styles.resultCard}>
              <div className={styles.resultToolbar}>
                <div>
                  <h2>{dispatchCopy.resultTitle}</h2>
                  <p className="muted">{campaign.name}</p>
                </div>
                {resultSummary.failed > 0 ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={dispatching || submitting}
                    onClick={() => openDispatchConfirmation('retry')}
                  >
                    {dispatchCopy.retryButton}
                  </button>
                ) : null}
              </div>

              <div className={styles.resultGrid}>
                <StatCard label={dispatchCopy.queued} value={resultSummary.queued} tone="green" />
                <StatCard label={dispatchCopy.alreadyProcessed} value={resultSummary.alreadyProcessed} tone="blue" />
                <StatCard label={ui.excluded} value={resultSummary.notSelected + resultSummary.excluded} tone="amber" />
                <StatCard label={dispatchCopy.failed} value={resultSummary.failed} tone="red" />
              </div>

              <div className={`${styles.resultBanner} ${resultSummary.failed > 0 || resultSummary.unknown > 0 ? styles.resultBannerWarning : styles.resultBannerSuccess}`} role="status">
                {resultSummary.unknown > 0
                  ? dispatchCopy.resultUnknown
                  : resultSummary.failed === 0
                    ? dispatchCopy.resultComplete
                    : resultSummary.queued + resultSummary.alreadyProcessed > 0
                      ? dispatchCopy.resultPartial
                      : dispatchCopy.resultFailed}
              </div>

              <div>
                <h3>{dispatchCopy.resultDetails}</h3>
                <ul className={styles.resultList}>
                  {dispatchResult.results.map((row) => {
                    const statusMeta = getParentActivationDispatchStatusMeta(locale, row.status);
                    const exclusionLabel = row.status === 'excluded'
                      ? getParentActivationExclusionLabel(locale, t, row.exclusion_reason)
                      : null;
                    const failureLabel = row.status === 'failed'
                      ? getParentActivationDispatchFailureLabel(locale, row.error_code)
                      : null;
                    return (
                      <li key={row.recipient_id} className={styles.resultRow}>
                        <div className={styles.recipientName}>
                          <Link href={`/admin/parents/${row.parent_id}`} dir="auto">{row.parent_name}</Link>
                        </div>
                        <div className={styles.recipientState}>
                          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                          {exclusionLabel ? <span className={styles.recipientReason}>{exclusionLabel}</span> : null}
                          {failureLabel ? <span className={styles.recipientReason}>{failureLabel}</span> : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>
          ) : null}
        </section>
      ) : null}

      <ConfirmationDialog
        open={confirmOpen}
        title={confirmIsRetry ? dispatchCopy.retryTitle : ui.confirmDispatch}
        confirmLabel={confirmIsRetry ? dispatchCopy.retryButton : ui.sendNow}
        loading={dispatching}
        closeOnBackdrop={!dispatching}
        onClose={() => { if (!dispatching) setConfirmOpen(false); }}
        onConfirm={dispatchCampaign}
        body={campaign ? (
          <div className={styles.confirmBody}>
            <p>
              {confirmIsRetry && resultSummary
                ? dispatchCopy.retryDescriptionFor(resultSummary.failed)
                : `${ui.selectedAttempt}: ${selectedForDispatch}.`}
            </p>
            <div className={styles.confirmSummary}>
              <div className={styles.confirmMetric}>
                <span className="muted">{ui.selectedForDispatch}</span>
                <strong>{selectedForDispatch}</strong>
              </div>
              <div className={styles.confirmMetric}>
                <span className="muted">{ui.ineligibleCount}</span>
                <strong>{campaign.counts.excluded}</strong>
              </div>
              <div className={styles.confirmMetric}>
                <span className="muted">{ui.manuallyIncluded}</span>
                <strong>{campaign.selection_counts.manually_included}</strong>
              </div>
              <div className={styles.confirmMetric}>
                <span className="muted">{ui.manuallyExcluded}</span>
                <strong>{campaign.selection_counts.manually_excluded}</strong>
              </div>
            </div>
            <p className="muted">{dispatchCopy.confirmRevalidation}</p>
          </div>
        ) : null}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select value={value} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function MiniMetric({ label, value, emphasize = false }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <div className={`${styles.miniMetric} ${emphasize ? styles.miniMetricEmphasis : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDateTime(value: string, locale: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}
