'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  PageHeader,
  Badge,
  Card,
  DefinitionList,
  InfoBanner,
} from '@/components/ui/primitives';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { formatDateTime } from '@/lib/utils/format';
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
import {
  communicationContentTypeMessageKey,
  communicationStateMessageKey,
  stripHtmlPreview,
} from '@/features/communication/utils/communication-labels';
import type { ApiErrorBody } from '@/types/api';
import type { CommunicationContent } from '@/types/communication';
import '../communication-review.css';

function AdminCommunicationDetailInner({ id }: { id: number }) {
  const t = useT();
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
      const key = communicationErrorMessageKey(res.error?.code);
      toast.error(key ? t(key) : res.error?.message || t('channels.sendFailed'));
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

  async function runResubmit() {
    if (!item?.channel_id || acting) return;
    const body = resubmitBody.trim();
    if (!body) return;
    setActing(true);
    const res = await resubmitAdminChannelPendingMessage(item.channel_id, item.id, {
      body,
      subject: resubmitSubject.trim() || undefined,
    });
    setActing(false);
    if (!res.success) {
      const key = communicationErrorMessageKey(res.error?.code);
      toast.error(key ? t(key) : res.error?.message || t('channels.sendFailed'));
      // Keep draft text on failure.
      return;
    }
    const data = res.data as Record<string, unknown> | CommunicationContent | undefined;
    toast.success(t('channels.pendingResubmitSuccess'));
    setShowResubmit(false);
    // Refresh detail — never insert into published channel list here.
    if (data && typeof data === 'object' && 'state' in data) {
      setItem((prev) =>
        prev
          ? {
              ...prev,
              ...(data as CommunicationContent),
              state:
                (data as { communication_state?: string; state?: string }).communication_state ||
                (data as { state?: string }).state ||
                'submitted',
            }
          : prev,
      );
    }
    void load();
  }

  if (loading) return <LoadingState label={t('communication.loading')} />;
  if (error) return <ApiErrorView error={error} onRetry={() => void load()} />;
  if (!item) {
    return <EmptyState icon="📣" title={t('communication.notFound')} />;
  }

  const actions = new Set(item.allowed_actions ?? []);
  const body = item.body || item.current_version?.body || '';
  const isApprovedAwaitingPublish = item.state === 'approved';
  const canAuthorResubmit = canResubmitPendingContent(item, {
    currentUserId: user.id,
    requireChannelMessage: true,
  });
  const changeReason =
    item.changes_requested_reason || item.last_decision_reason || null;

  return (
    <div className="admin-workspace communication-review">
      <Link href="/admin/communication?filter=submitted" className="back-link">
        ‹ {t('communication.backToReview')}
      </Link>
      <PageHeader
        title={item.subject || item.name || `#${item.id}`}
        subtitle={t(communicationContentTypeMessageKey(item.content_type))}
        actions={
          <Badge tone={item.state === 'published' ? 'green' : 'amber'}>
            {t(communicationStateMessageKey(item.state))}
          </Badge>
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

      <Card>
        <DefinitionList
          items={[
            {
              label: t('communication.author'),
              value: item.author?.name || t('common.dash'),
            },
            {
              label: t('communication.createdByRole'),
              value: item.created_by_role || t('common.dash'),
            },
            {
              label: t('communication.direction'),
              value: item.message_direction || t('common.dash'),
            },
            {
              label: t('communication.audience'),
              value: item.audience_summary?.label || t('common.dash'),
            },
            {
              label: t('communication.channel'),
              value:
                item.channel_id != null ? (
                  <Link href={`/admin/channels/${item.channel_id}`}>
                    #{item.channel_id}
                  </Link>
                ) : (
                  t('common.dash')
                ),
            },
            {
              label: t('communication.submittedAt'),
              value: item.submitted_at ? formatDateTime(item.submitted_at) : t('common.dash'),
            },
            {
              label: t('communication.publishedMessageId'),
              value:
                item.published_message_id != null
                  ? String(item.published_message_id)
                  : t('common.dash'),
            },
            {
              label: t('communication.reviewer'),
              value: item.reviewer?.name || t('common.dash'),
            },
          ]}
        />
      </Card>

      <Card>
        <h2 className="communication-review__section-title">{t('communication.body')}</h2>
        <div className="communication-review__body" dir="auto">
          {stripHtmlPreview(body, 4000) || t('common.dash')}
        </div>
      </Card>

      {canAuthorResubmit ? (
        <Card>
          <h2 className="communication-review__section-title">
            {t('channels.pendingResubmit')}
          </h2>
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
              <label className="tiny" htmlFor="comm-resubmit-subject">
                {t('communication.subjectOptional')}
              </label>
              <input
                id="comm-resubmit-subject"
                className="input"
                value={resubmitSubject}
                onChange={(e) => setResubmitSubject(e.target.value)}
              />
              <label className="tiny" htmlFor="comm-resubmit-body">
                {t('communication.body')}
              </label>
              <textarea
                id="comm-resubmit-body"
                className="textarea"
                rows={5}
                value={resubmitBody}
                onChange={(e) => setResubmitBody(e.target.value)}
              />
              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={acting || !resubmitBody.trim()}
                  onClick={() => void runResubmit()}
                >
                  {acting ? t('channels.sending') : t('channels.pendingResubmit')}
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

      {(showReason || actions.has('request_changes') || actions.has('cancel')) && (
        <Card>
          <label className="tiny" htmlFor="comm-reason">
            {t('communication.changeRequestReason')}
          </label>
          <textarea
            id="comm-reason"
            className="textarea"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('communication.reasonPlaceholder')}
          />
        </Card>
      )}

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {actions.has('request_changes') ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={acting}
            onClick={() => {
              setShowReason(true);
              void runAction(
                () => requestChangesCommunicationContent(item.id, reason.trim()),
                { requireReason: true },
              );
            }}
          >
            {t('communication.actions.requestChanges')}
          </button>
        ) : null}
        {actions.has('approve') ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={acting}
            onClick={() => void runAction(() => approveCommunicationContent(item.id))}
          >
            {t('communication.actions.approve')}
          </button>
        ) : null}
        {actions.has('publish') ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={acting}
            onClick={() => void runAction(() => publishCommunicationContent(item.id))}
          >
            {t('communication.actions.publish')}
          </button>
        ) : null}
        {actions.has('schedule') ? (
          <div className="row" style={{ gap: 8 }}>
            <input
              type="datetime-local"
              className="input"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              aria-label={t('communication.actions.schedule')}
            />
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={acting || !scheduleAt}
              onClick={() =>
                void runAction(() =>
                  scheduleCommunicationContent(item.id, new Date(scheduleAt).toISOString()),
                )
              }
            >
              {t('communication.actions.schedule')}
            </button>
          </div>
        ) : null}
        {actions.has('cancel') ? (
          <button
            type="button"
            className="btn btn--danger btn--sm"
            disabled={acting}
            onClick={() =>
              void runAction(() => cancelCommunicationContent(item.id, reason.trim() || undefined))
            }
          >
            {t('communication.actions.cancel')}
          </button>
        ) : null}
      </div>

      <Card>
        <h2 className="communication-review__section-title">{t('communication.auditTitle')}</h2>
        {(item.audit_decisions ?? []).length === 0 ? (
          <p className="tiny muted">{t('communication.auditEmpty')}</p>
        ) : (
          <ol className="communication-review__audit">
            {(item.audit_decisions ?? []).map((d) => (
              <li key={d.id}>
                <strong>{d.decision}</strong>
                {' · '}
                {d.actor?.name || t('common.dash')}
                {' · '}
                {d.decision_at ? formatDateTime(d.decision_at) : t('common.dash')}
                {d.reason ? (
                  <div className="tiny muted" dir="auto">
                    {d.reason}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

export function AdminCommunicationDetailPage({ id }: { id: number }) {
  return (
    <RequireAdminPermission permission="view_channels">
      <AdminCommunicationDetailInner id={id} />
    </RequireAdminPermission>
  );
}
