'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Reviewer-focused communication detail. Technical backend codes are translated
 * or omitted from the product surface; workflow actions remain Backend-driven.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  PageHeader,
  Badge,
  Card,
  DefinitionList,
  InfoBanner,
} from '@/components/ui/primitives';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { RequireCommunicationReviewAccess } from '@/features/admin/communication/components/require-communication-review';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { formatDateTime } from '@/lib/i18n/format';
import { canResubmitPendingContent } from '@/features/channels/utils/can-resubmit-pending';
import { communicationErrorMessageKey } from '@/features/channels/utils/communication-errors';
import {
  approveCommunicationContent,
  cancelCommunicationContent,
  fetchCommunicationContentDetail,
  publishCommunicationContent,
  requestChangesCommunicationContent,
  resubmitAdminChannelPendingMessage,
  scheduleCommunicationContent,
} from '@/features/communication/api/admin-communication-api';
import { RecipientSummaryPanel } from '@/features/communication/components/recipient-summary-panel';
import { normalizeRecipientSummary } from '@/features/communication/utils/normalize-recipient-summary';
import {
  communicationActorRoleMessageKey,
  communicationAuditDecisionMessageKey,
  communicationContentTypeMessageKey,
  communicationStateMessageKey,
  stripHtmlPreview,
} from '@/features/communication/utils/communication-labels';
import { hasCommunicationRecordAction } from '@/lib/permissions/communication';
import type { ApiErrorBody } from '@/types/api';
import type { CommunicationContent } from '@/types/communication';
import '../communication-review.css';

function AdminCommunicationDetailInner({ id }: { id: number }) {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const user = useSession();
  const [item, setItem] = useState<CommunicationContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [reason, setReason] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [acting, setActing] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [showResubmit, setShowResubmit] = useState(false);
  const [resubmitBody, setResubmitBody] = useState('');
  const [resubmitSubject, setResubmitSubject] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchCommunicationContentDetail(id);
    if (res.success) {
      setItem(res.data);
      setError(null);
    } else {
      setError(res.error);
      setItem(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function showActionError(actionError?: ApiErrorBody) {
    const key = communicationErrorMessageKey(actionError?.code);
    toast.error(key ? t(key) : t('channels.sendFailed'));
  }

  async function runAction(
    action: () => Promise<{ success: boolean; error?: ApiErrorBody; data?: CommunicationContent }>,
    opts?: { requireReason?: boolean; successKey?: string },
  ) {
    if (opts?.requireReason && !reason.trim()) {
      toast.error(t('communication.errors.reasonRequired'));
      setShowReason(true);
      return;
    }
    if (acting) return;
    setActing(true);
    const res = await action();
    setActing(false);
    if (!res.success) {
      showActionError(res.error);
      if (
        res.error?.code === 'communication_message_audience_changed' ||
        res.error?.code === 'communication_invalid_transition'
      ) {
        void load();
      }
      return;
    }
    if (res.data) setItem(res.data as CommunicationContent);
    else void load();
    setReason('');
    setShowReason(false);
    toast.success(t(opts?.successKey ?? 'communication.actionSuccess'));
  }

  async function runApproveAndPublish() {
    if (acting || !item) return;
    setActing(true);

    const approved = await approveCommunicationContent(item.id);
    if (!approved.success) {
      setActing(false);
      showActionError(approved.error);
      void load();
      return;
    }

    if (approved.data) setItem(approved.data);

    const published = await publishCommunicationContent(item.id);
    setActing(false);

    if (!published.success) {
      showActionError(published.error);
      void load();
      return;
    }

    if (published.data) setItem(published.data);
    else void load();
    toast.success(t('communication.actionSuccess'));
  }

  async function runResubmit() {
    if (!item?.channel_id || acting) return;
    const nextBody = resubmitBody.trim();
    if (!nextBody) return;

    setActing(true);
    const res = await resubmitAdminChannelPendingMessage(item.channel_id, item.id, {
      body: nextBody,
      subject: resubmitSubject.trim() || undefined,
    });
    setActing(false);

    if (!res.success) {
      showActionError(res.error);
      return;
    }

    const data = res.data as Record<string, unknown> | CommunicationContent | undefined;
    toast.success(t('channels.pendingResubmitSuccess'));
    setShowResubmit(false);

    if (data && typeof data === 'object' && 'state' in data) {
      setItem((previous) =>
        previous
          ? {
              ...previous,
              ...(data as CommunicationContent),
              state:
                (data as { communication_state?: string; state?: string }).communication_state ||
                (data as { state?: string }).state ||
                'submitted',
            }
          : previous,
      );
    }
    void load();
  }

  if (loading) return <LoadingState label={t('communication.loading')} />;
  if (error) return <ApiErrorView error={error} onRetry={() => void load()} />;
  if (!item) return <EmptyState icon="📣" title={t('communication.notFound')} />;

  const actions = item.allowed_actions ?? [];
  const body = item.body || item.current_version?.body || '';
  const isSubmitted = item.state === 'submitted';
  const isApprovedAwaitingPublish = item.state === 'approved';
  const canAuthorResubmit = canResubmitPendingContent(item, {
    currentUserId: user.id,
    requireChannelMessage: true,
  });
  const changeReason = item.changes_requested_reason || item.last_decision_reason || null;
  const frozenSummary =
    normalizeRecipientSummary(item.recipient_summary) ??
    (item.snapshot_id != null || item.snapshot_fingerprint
      ? normalizeRecipientSummary({
          snapshot_id: item.snapshot_id,
          snapshot_fingerprint: item.snapshot_fingerprint,
          version_id: item.version_id,
          audience_changed: item.audience_changed,
          is_frozen: true,
        })
      : null);

  const canEdit = hasCommunicationRecordAction(actions, 'edit');
  const canRequestChanges = hasCommunicationRecordAction(actions, 'request_changes');
  const canApprove = hasCommunicationRecordAction(actions, 'approve');
  const canPublish = hasCommunicationRecordAction(actions, 'publish');
  const canSchedule = hasCommunicationRecordAction(actions, 'schedule');
  const canCancel = hasCommunicationRecordAction(actions, 'cancel');

  const roleMessageKey = communicationActorRoleMessageKey(item.created_by_role);
  const audienceLabels = Array.from(
    new Set(
      [
        item.audience_summary?.class?.name,
        item.audience_summary?.level?.name,
        item.audience_summary?.subject?.name,
        ...(frozenSummary?.audience_labels ?? []),
      ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
    ),
  );

  function actorName(name: string | null | undefined): string {
    const value = name?.trim();
    if (!value) return t('common.dash');
    if (value.toLowerCase() === 'administrator') return t('roles.admin');
    return value;
  }

  const metadataItems: Array<{ label: string; value: ReactNode }> = [
    {
      label: t('communication.author'),
      value: actorName(item.author?.name),
    },
    {
      label: t('communication.createdByRole'),
      value: roleMessageKey ? t(roleMessageKey) : t('common.dash'),
    },
    {
      label: t('communication.audience'),
      value: audienceLabels.length > 0 ? audienceLabels.join(' / ') : t('common.dash'),
    },
    {
      label: t('communication.submittedAt'),
      value: item.submitted_at ? formatDateTime(item.submitted_at, locale) : t('common.dash'),
    },
    {
      label: t('communication.reviewer'),
      value: actorName(item.reviewer?.name),
    },
  ];

  if (item.channel_id != null) {
    metadataItems.push({
      label: t('communication.channel'),
      value: <Link href={`/admin/channels/${item.channel_id}`}>#{item.channel_id}</Link>,
    });
  }

  const hasActions = canRequestChanges || canApprove || canPublish || canSchedule || canCancel;
  const approvePublishLabel = `${t('communication.actions.approve')} + ${t('communication.actions.publish')}`;

  return (
    <div className="admin-workspace communication-review communication-detail">
      <Link href="/admin/communication?filter=submitted" className="back-link">
        ‹ {t('communication.backToReview')}
      </Link>

      <PageHeader
        title={item.subject || item.name || `#${item.id}`}
        subtitle={t(communicationContentTypeMessageKey(item.content_type))}
        actions={
          <div className="wrap-gap">
            {canEdit ? (
              <Link href={`/admin/communication/${item.id}/edit`} className="btn btn--ghost btn--sm">
                {t('common.edit')}
              </Link>
            ) : null}
            <Badge tone={item.state === 'published' ? 'green' : 'amber'}>
              {t(communicationStateMessageKey(item.state))}
            </Badge>
          </div>
        }
      />

      {isApprovedAwaitingPublish ? (
        <InfoBanner
          tone="amber"
          title={t('communication.approvedNotPublishedTitle')}
          description={t('communication.approvedNotPublishedDesc')}
        />
      ) : null}

      {item.state === 'changes_requested' && changeReason ? (
        <InfoBanner
          tone="amber"
          title={t('communication.changeRequestReason')}
          description={changeReason}
        />
      ) : null}

      <div className="communication-detail__layout">
        <div className="communication-detail__main">
          <Card className="communication-detail__content-card">
            <div className="communication-detail__section-head">
              <div>
                <h2 className="communication-review__section-title">{t('communication.body')}</h2>
                <div className="communication-review__badges">
                  <Badge tone="slate">{t(communicationContentTypeMessageKey(item.content_type))}</Badge>
                  <Badge tone={isSubmitted ? 'amber' : item.state === 'published' ? 'green' : 'slate'}>
                    {t(communicationStateMessageKey(item.state))}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="communication-review__body" dir="auto">
              {stripHtmlPreview(body, 4000) || t('common.dash')}
            </div>
          </Card>

          <Card className="communication-detail__recipient-card">
            <h2 className="communication-review__section-title">{t('communication.recipients.frozenTitle')}</h2>
            <RecipientSummaryPanel summary={frozenSummary} presentation="frozen" />
          </Card>

          {canAuthorResubmit ? (
            <Card>
              <h2 className="communication-review__section-title">{t('channels.pendingResubmit')}</h2>
              {!showResubmit ? (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={acting}
                  onClick={() => {
                    setShowResubmit(true);
                    setResubmitBody(stripHtmlPreview(body, 4000));
                    setResubmitSubject(item.subject || '');
                  }}
                >
                  {t('channels.pendingEditResubmit')}
                </button>
              ) : (
                <div className="stack" style={{ gap: 10 }}>
                  <label className="tiny" htmlFor="comm-resubmit-subject">{t('communication.subjectOptional')}</label>
                  <input
                    id="comm-resubmit-subject"
                    className="input"
                    value={resubmitSubject}
                    onChange={(event) => setResubmitSubject(event.target.value)}
                  />
                  <label className="tiny" htmlFor="comm-resubmit-body">{t('communication.body')}</label>
                  <textarea
                    id="comm-resubmit-body"
                    className="textarea"
                    rows={5}
                    value={resubmitBody}
                    onChange={(event) => setResubmitBody(event.target.value)}
                  />
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={acting || !resubmitBody.trim()}
                      onClick={() => void runResubmit()}
                    >
                      {acting ? t('common.loading') : t('channels.pendingResubmit')}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={acting}
                      onClick={() => setShowResubmit(false)}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ) : null}

          <Card>
            <h2 className="communication-review__section-title">{t('communication.auditTitle')}</h2>
            {(item.audit_decisions ?? []).length === 0 ? (
              <p className="tiny muted">{t('communication.auditEmpty')}</p>
            ) : (
              <ol className="communication-review__audit">
                {(item.audit_decisions ?? []).map((decision) => (
                  <li key={decision.id}>
                    <div className="communication-review__audit-head">
                      <Badge tone="slate">{t(communicationAuditDecisionMessageKey(decision.decision))}</Badge>
                      <span dir="auto">{actorName(decision.actor?.name)}</span>
                      <span className="muted">
                        {decision.decision_at ? formatDateTime(decision.decision_at, locale) : t('common.dash')}
                      </span>
                    </div>
                    {decision.reason ? <div className="tiny muted" dir="auto">{decision.reason}</div> : null}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <aside className="communication-detail__side">
          <Card className="communication-detail__metadata-card">
            <h2 className="communication-review__section-title">{t('communication.reviewTitle')}</h2>
            <DefinitionList items={metadataItems} />
          </Card>

          {hasActions ? (
            <Card className="communication-detail__actions-card">
              <h2 className="communication-review__section-title">{t('common.actions')}</h2>

              <div className="communication-detail__actions">
                {canApprove ? (
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={acting}
                    onClick={() => void runApproveAndPublish()}
                  >
                    {acting ? t('common.loading') : approvePublishLabel}
                  </button>
                ) : canPublish ? (
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={acting}
                    onClick={() => void runAction(() => publishCommunicationContent(item.id))}
                  >
                    {acting ? t('common.loading') : t('communication.actions.publish')}
                  </button>
                ) : null}

                {canRequestChanges ? (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={acting}
                    onClick={() => setShowReason((current) => !current)}
                  >
                    {t('communication.actions.requestChanges')}
                  </button>
                ) : null}

                {canSchedule ? (
                  <div className="communication-detail__schedule">
                    <input
                      type="datetime-local"
                      className="input"
                      value={scheduleAt}
                      onChange={(event) => setScheduleAt(event.target.value)}
                      aria-label={t('communication.actions.schedule')}
                    />
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={acting || !scheduleAt}
                      onClick={() => void runAction(() => scheduleCommunicationContent(item.id, new Date(scheduleAt).toISOString()))}
                    >
                      {t('communication.actions.schedule')}
                    </button>
                  </div>
                ) : null}

                {canCancel ? (
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    disabled={acting}
                    onClick={() => void runAction(() => cancelCommunicationContent(item.id, reason.trim() || undefined))}
                  >
                    {t('communication.actions.cancel')}
                  </button>
                ) : null}
              </div>

              {showReason && canRequestChanges ? (
                <div className="communication-detail__reason">
                  <label className="tiny" htmlFor="comm-reason">{t('communication.changeRequestReason')}</label>
                  <textarea
                    id="comm-reason"
                    className="textarea"
                    rows={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={t('communication.reasonPlaceholder')}
                  />
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={acting || !reason.trim()}
                      onClick={() => void runAction(() => requestChangesCommunicationContent(item.id, reason.trim()), { requireReason: true })}
                    >
                      {t('communication.actions.requestChanges')}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={acting}
                      onClick={() => {
                        setShowReason(false);
                        setReason('');
                      }}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : null}
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export function AdminCommunicationDetailPage({ id }: { id: number }) {
  return (
    <RequireCommunicationReviewAccess>
      <AdminCommunicationDetailInner id={id} />
    </RequireCommunicationReviewAccess>
  );
}
