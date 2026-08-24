'use client';

/** @raqeem-design docs/design/RAQEEM-DESIGN.md @design-status adopted */
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Badge, Card, InfoBanner, PageHeader, StatCard } from '@/components/ui/primitives';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useLocale } from '@/features/i18n/locale-context';
import { getParentActivationExclusionLabel } from '@/features/parents/parent-activation-exclusion-reason';
import {
  buildParentActivationDispatchBody,
  canStartParentActivationDispatch,
  getParentActivationDispatchCopy,
  getParentActivationDispatchFailureLabel,
  getParentActivationDispatchStatusMeta,
  summarizeParentActivationDispatch,
  type ParentActivationRecipientFilter,
} from '@/features/parents/parent-activation-dispatch';
import type {
  ParentActivationCampaign,
  ParentActivationCampaignDispatch,
} from '@/types/parent-activation-campaign';
import styles from './activation-campaign.module.css';

export default function ParentActivationCampaignPage() {
  const { locale, t } = useLocale();
  const copy = getParentActivationDispatchCopy(locale);
  const [name, setName] = useState('');
  const [campaign, setCampaign] = useState<ParentActivationCampaign | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientFilter, setRecipientFilter] = useState<ParentActivationRecipientFilter>('all');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'initial' | 'retry'>('initial');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchResult, setDispatchResult] = useState<ParentActivationCampaignDispatch | null>(null);

  const filteredRecipients = useMemo(() => {
    if (!campaign) return [];
    if (recipientFilter === 'ready') {
      return campaign.recipients.filter((recipient) => recipient.eligible_for_send);
    }
    if (recipientFilter === 'excluded') {
      return campaign.recipients.filter((recipient) => !recipient.eligible_for_send);
    }
    return campaign.recipients;
  }, [campaign, recipientFilter]);

  const resultSummary = useMemo(
    () => dispatchResult ? summarizeParentActivationDispatch(dispatchResult) : null,
    [dispatchResult],
  );

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    setDispatchError(null);
    setDispatchResult(null);

    const response = await api.post<ParentActivationCampaign>(
      endpoints.admin.parentActivationCampaignPrepare,
      name.trim() ? { name: name.trim() } : {},
    );

    setSubmitting(false);
    if (!response.success) {
      setError(response.error.message);
      return;
    }

    setCampaign(response.data);
    setRecipientFilter(response.data.counts.ready > 0 ? 'ready' : 'excluded');
  }

  function openDispatchConfirmation(mode: 'initial' | 'retry') {
    if (!campaign || !canStartParentActivationDispatch(campaign.counts.ready, dispatching)) return;
    setConfirmMode(mode);
    setConfirmOpen(true);
    setDispatchError(null);
  }

  async function dispatchCampaign() {
    if (!campaign || !canStartParentActivationDispatch(campaign.counts.ready, dispatching)) return;

    setDispatching(true);
    setDispatchError(null);
    const response = await api.post<ParentActivationCampaignDispatch>(
      `${endpoints.admin.parentActivationCampaign(campaign.id)}/dispatch`,
      buildParentActivationDispatchBody(),
    );
    setDispatching(false);
    setConfirmOpen(false);

    if (!response.success) {
      setDispatchError(copy.dispatchRequestFailed);
      return;
    }

    setDispatchResult(response.data);
  }

  const canDispatch = campaign
    ? canStartParentActivationDispatch(campaign.counts.ready, dispatching)
    : false;

  const confirmIsRetry = confirmMode === 'retry' && Boolean(resultSummary?.failed);

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

      <InfoBanner
        title={copy.previewSafetyTitle}
        description={copy.previewSafetyDescription}
        tone="amber"
      />

      <Card className={styles.previewCard}>
        <div>
          <h2>{t('admin.parentActivation.stepOneTitle')}</h2>
          <p className="muted">{t('admin.parentActivation.stepOneDescription')}</p>
        </div>
        <form onSubmit={prepare} className={styles.previewForm}>
          <label className="field">
            <span className="field__label">{t('admin.parentActivation.nameLabel')}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={160}
              disabled={submitting || dispatching}
            />
          </label>
          <button type="submit" className="btn btn--primary" disabled={submitting || dispatching}>
            {submitting ? t('admin.parentActivation.preparing') : t('admin.parentActivation.prepare')}
          </button>
        </form>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </Card>

      {campaign ? (
        <section className={styles.reviewSection} aria-live="polite">
          <div className={styles.reviewHeading}>
            <div className={styles.reviewHeadingText}>
              <h2>{copy.reviewTitle}</h2>
              <p className="muted">{copy.reviewDescription}</p>
            </div>
            <Badge tone="blue">{t('admin.parentActivation.prepared')}</Badge>
          </div>

          <div className={styles.statGrid}>
            <div className={styles.readyStat}>
              <StatCard label={copy.readyEmphasis} value={campaign.counts.ready} tone="green" />
            </div>
            <StatCard label={t('admin.parentActivation.excluded')} value={campaign.counts.excluded} tone="amber" />
            <StatCard label={t('admin.parentActivation.total')} value={campaign.counts.total} tone="slate" />
          </div>

          <Card className={styles.recipientCard}>
            <div className={styles.filterBar} role="group" aria-label={t('admin.parentActivation.recipients')}>
              <FilterButton
                active={recipientFilter === 'ready'}
                label={copy.readyRecipients}
                count={campaign.counts.ready}
                onClick={() => setRecipientFilter('ready')}
              />
              <FilterButton
                active={recipientFilter === 'excluded'}
                label={copy.excludedRecipients}
                count={campaign.counts.excluded}
                onClick={() => setRecipientFilter('excluded')}
              />
              <FilterButton
                active={recipientFilter === 'all'}
                label={copy.allRecipients}
                count={campaign.counts.total}
                onClick={() => setRecipientFilter('all')}
              />
            </div>

            {campaign.recipients.length === 0 ? (
              <p className={styles.emptyState}>{t('admin.parentActivation.noRecipients')}</p>
            ) : filteredRecipients.length === 0 ? (
              <p className={styles.emptyState}>—</p>
            ) : (
              <ul className={styles.recipientList}>
                {filteredRecipients.map((recipient) => {
                  const exclusionLabel = getParentActivationExclusionLabel(
                    locale,
                    t,
                    recipient.exclusion_reason,
                  );
                  return (
                    <li key={recipient.parent_id} className={styles.recipientRow}>
                      <div className={styles.recipientName}>
                        <Link href={`/admin/parents/${recipient.parent_id}`} dir="auto">
                          {recipient.parent_name}
                        </Link>
                      </div>
                      <div className={styles.recipientState}>
                        {recipient.eligible_for_send ? (
                          <Badge tone="green">{t('admin.parentActivation.eligible')}</Badge>
                        ) : (
                          <>
                            <Badge tone="amber">{t('admin.parentActivation.excluded')}</Badge>
                            {exclusionLabel ? (
                              <span className={styles.recipientReason}>{exclusionLabel}</span>
                            ) : null}
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className={styles.dispatchCard}>
            <div className={styles.dispatchHeader}>
              <div>
                <h2>{copy.dispatchStepTitle}</h2>
                <p className="muted">{copy.dispatchStepDescription}</p>
              </div>
              <Badge tone={campaign.counts.ready > 0 ? 'green' : 'amber'}>
                {campaign.counts.ready} {copy.readyRecipients}
              </Badge>
            </div>

            {campaign.counts.ready === 0 ? (
              <InfoBanner
                title={copy.noReadyTitle}
                description={copy.noReadyDescription}
                tone="amber"
              />
            ) : null}

            {dispatchError ? <p className="form-error" role="alert">{dispatchError}</p> : null}

            <div className={styles.dispatchAction}>
              <span className={styles.dispatchHint}>{copy.confirmRevalidation}</span>
              <button
                type="button"
                className={`btn btn--primary ${styles.primaryAction}`}
                disabled={!canDispatch}
                onClick={() => openDispatchConfirmation('initial')}
              >
                {dispatching ? copy.sending : copy.sendButtonFor(campaign.counts.ready)}
              </button>
            </div>
          </Card>

          {dispatchResult && resultSummary ? (
            <Card className={styles.resultCard}>
              <div className={styles.resultToolbar}>
                <div>
                  <h2>{copy.resultTitle}</h2>
                  <p className="muted">{campaign.name}</p>
                </div>
                {resultSummary.failed > 0 ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={dispatching}
                    onClick={() => openDispatchConfirmation('retry')}
                  >
                    {copy.retryButton}
                  </button>
                ) : null}
              </div>

              <div className={styles.resultGrid}>
                <StatCard label={copy.queued} value={resultSummary.queued} tone="green" />
                <StatCard label={copy.alreadyProcessed} value={resultSummary.alreadyProcessed} tone="blue" />
                <StatCard label={copy.notSent} value={resultSummary.excluded} tone="amber" />
                <StatCard label={copy.failed} value={resultSummary.failed} tone="red" />
              </div>

              <div
                className={`${styles.resultBanner} ${
                  resultSummary.failed > 0 || resultSummary.unknown > 0
                    ? styles.resultBannerWarning
                    : styles.resultBannerSuccess
                }`}
                role="status"
              >
                {resultSummary.unknown > 0
                  ? copy.resultUnknown
                  : resultSummary.failed === 0
                    ? copy.resultComplete
                    : resultSummary.queued + resultSummary.alreadyProcessed > 0
                      ? copy.resultPartial
                      : copy.resultFailed}
              </div>

              <div>
                <h3>{copy.resultDetails}</h3>
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
                          <Link href={`/admin/parents/${row.parent_id}`} dir="auto">
                            {row.parent_name}
                          </Link>
                        </div>
                        <div className={styles.recipientState}>
                          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                          {exclusionLabel ? (
                            <span className={styles.recipientReason}>{exclusionLabel}</span>
                          ) : null}
                          {failureLabel ? (
                            <span className={styles.recipientReason}>{failureLabel}</span>
                          ) : null}
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
        title={confirmIsRetry ? copy.retryTitle : copy.confirmTitle}
        confirmLabel={confirmIsRetry ? copy.retryButton : copy.confirmSend}
        loading={dispatching}
        closeOnBackdrop={!dispatching}
        onClose={() => {
          if (!dispatching) setConfirmOpen(false);
        }}
        onConfirm={dispatchCampaign}
        body={campaign ? (
          <div className={styles.confirmBody}>
            <p>
              {confirmIsRetry && resultSummary
                ? copy.retryDescriptionFor(resultSummary.failed)
                : copy.confirmDescriptionFor(campaign.counts.ready)}
            </p>
            <div className={styles.confirmSummary}>
              <div className={styles.confirmMetric}>
                <span className="muted">{copy.readyRecipients}</span>
                <strong>{campaign.counts.ready}</strong>
              </div>
              <div className={styles.confirmMetric}>
                <span className="muted">{copy.excludedRecipients}</span>
                <strong>{campaign.counts.excluded}</strong>
              </div>
            </div>
            <p>{copy.confirmExcludedFor(campaign.counts.excluded)}</p>
            <p className="muted">{copy.confirmRevalidation}</p>
          </div>
        ) : null}
      />
    </div>
  );
}

function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.filterButton} ${active ? styles.filterButtonActive : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <span>{label}</span>
      <span className={styles.filterCount}>{count}</span>
    </button>
  );
}
