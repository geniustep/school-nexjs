'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { channelsEndpointsForRole } from '@/lib/api/channel-endpoints';
import { useSession } from '@/features/auth/session-context';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/primitives';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import { formatDateTime } from '@/lib/utils/format';
import { canResubmitPendingContent } from '@/features/channels/utils/can-resubmit-pending';
import { communicationErrorMessageKey } from '@/features/channels/utils/communication-errors';
import { previewChannelMessageRecipients } from '@/features/channels/api/preview-channel-message-recipients';
import { RecipientPreviewDialog } from '@/features/communication/components/recipient-preview-dialog';
import { RecipientSummaryPanel } from '@/features/communication/components/recipient-summary-panel';
import { normalizeRecipientSummary } from '@/features/communication/utils/normalize-recipient-summary';
import {
  communicationStateMessageKey,
  stripHtmlPreview,
} from '@/features/communication/utils/communication-labels';
import type { ApiErrorBody } from '@/types/api';
import type {
  CommunicationContent,
  CommunicationRecipientSummary,
} from '@/types/communication';

function contentBody(item: CommunicationContent): string {
  return (
    item.body ||
    item.current_version?.body ||
    item.subject ||
    ''
  );
}

export function MyPendingMessagesPanel({
  channelId,
  reloadToken = 0,
}: {
  channelId: number;
  /** Increment to force refetch after submit/resubmit. */
  reloadToken?: number;
}) {
  const t = useT();
  const user = useSession();
  const toast = useToast();
  // Resolve path inside load — channelsEndpointsForRole returns a new object each call,
  // so it must never be a useCallback/useEffect dependency (that caused an infinite refetch loop
  // against /admin/channels/:id/pending-messages).
  const role = user.role;
  const [items, setItems] = useState<CommunicationContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState('');
  const [actingId, setActingId] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<CommunicationRecipientSummary | null>(
    null,
  );
  const [previewContentId, setPreviewContentId] = useState<number | null>(null);
  const [previewBodyKey, setPreviewBodyKey] = useState<string | null>(null);
  const [previewPhase, setPreviewPhase] = useState<'idle' | 'previewing' | 'submitting'>('idle');
  const inFlightRef = useRef(false);
  const loadGenerationRef = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    const endpoints = channelsEndpointsForRole(role);
    const res = await api.get<CommunicationContent[]>(endpoints.myPendingMessages(channelId), {
      page: 1,
      limit: 50,
    });
    if (generation !== loadGenerationRef.current) return;
    if (res.success) {
      setItems(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } else {
      // Admin accounts are redirected to admin pending list; 403 here is expected for some roles.
      if (res.error.code === 'forbidden' || res.error.code === 'permission_denied') {
        setItems([]);
        setError(null);
      } else {
        setError(res.error);
      }
    }
    setLoading(false);
  }, [channelId, role]);

  useEffect(() => {
    void load();
    return () => {
      // Invalidate any in-flight load so unmount / channel switch cannot write stale state.
      loadGenerationRef.current += 1;
    };
  }, [load, reloadToken]);

  async function requestResubmitPreview(item: CommunicationContent) {
    const text = editBody.trim();
    if (!text || inFlightRef.current || actingId != null) return;
    inFlightRef.current = true;
    setPreviewPhase('previewing');
    setActingId(item.id);
    const result = await previewChannelMessageRecipients({
      role: user.role,
      channelId,
      body: text,
    });
    inFlightRef.current = false;
    setActingId(null);
    if (!result.ok) {
      setPreviewPhase('idle');
      const key = communicationErrorMessageKey(result.error.code);
      toast.error(key ? t(key) : result.error.message || t('channels.sendFailed'));
      return;
    }
    setPreviewSummary(result.preview.recipient_summary);
    setPreviewContentId(item.id);
    setPreviewBodyKey(text);
    setPreviewOpen(true);
    setPreviewPhase('idle');
  }

  async function confirmResubmit() {
    if (
      previewContentId == null ||
      previewBodyKey == null ||
      inFlightRef.current ||
      previewSummary?.can_submit === false
    ) {
      return;
    }
    const text = editBody.trim();
    if (!text || text !== previewBodyKey) {
      setPreviewOpen(false);
      setPreviewSummary(null);
      return;
    }
    inFlightRef.current = true;
    setPreviewPhase('submitting');
    setActingId(previewContentId);
    const res = await api.post(endpoints.pendingMessageResubmit(channelId, previewContentId), {
      body: text,
    });
    inFlightRef.current = false;
    setActingId(null);
    setPreviewPhase('idle');
    if (!res.success) {
      const key = communicationErrorMessageKey(res.error.code);
      toast.error(key ? t(key) : res.error.message || t('channels.sendFailed'));
      if (
        res.error.code === 'communication_message_audience_changed' ||
        res.error.code === 'communication_invalid_transition' ||
        res.error.code === 'communication_recipient_audience_changed'
      ) {
        void load();
      }
      return;
    }
    toast.success(t('channels.pendingResubmitSuccess'));
    setEditingId(null);
    setEditBody('');
    setPreviewOpen(false);
    setPreviewSummary(null);
    setPreviewContentId(null);
    setPreviewBodyKey(null);
    void load();
  }

  if (loading) {
    return <LoadingState label={t('channels.pendingLoading')} />;
  }
  if (error) {
    return <ApiErrorView error={error} onRetry={() => void load()} />;
  }
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="channels-pending" aria-labelledby={`channels-pending-${channelId}`}>
      <div className="channels-pending__head">
        <h2 id={`channels-pending-${channelId}`} className="channels-pending__title">
          {t('channels.myPendingTitle')}
        </h2>
        <p className="tiny muted">{t('channels.myPendingHint')}</p>
      </div>
      <ul className="channels-pending__list">
        {items.map((item) => {
          const canResubmit = canResubmitPendingContent(item, {
            currentUserId: user.id,
            requireChannelMessage: user.role === 'admin',
          });
          const reason =
            item.changes_requested_reason ||
            item.last_decision_reason ||
            null;
          const audience = item.audience_summary?.label || t('common.dash');
          const preview = stripHtmlPreview(contentBody(item));
          const isEditing = editingId === item.id;
          const frozenSummary = normalizeRecipientSummary(item.recipient_summary);

          return (
            <li key={`content-${item.id}`} className="channels-pending__card card card--pad">
              <div className="between" style={{ gap: 8, flexWrap: 'wrap' }}>
                <Badge tone={item.state === 'changes_requested' ? 'amber' : 'slate'}>
                  {t(communicationStateMessageKey(item.state))}
                </Badge>
                <span className="tiny faint">
                  {item.submitted_at
                    ? formatDateTime(item.submitted_at)
                    : item.created_at
                      ? formatDateTime(item.created_at)
                      : t('common.dash')}
                </span>
              </div>
              <p className="channels-pending__body" dir="auto">
                {preview || t('common.dash')}
              </p>
              <div className="tiny faint">
                {t('communication.audience')}: {audience}
              </div>
              {frozenSummary ? (
                <RecipientSummaryPanel
                  summary={frozenSummary}
                  presentation="frozen"
                  compact
                />
              ) : null}
              {reason ? (
                <div className="channels-pending__reason">
                  <strong className="tiny">{t('communication.changeRequestReason')}</strong>
                  <p className="tiny" dir="auto">
                    {reason}
                  </p>
                </div>
              ) : null}
              {canResubmit ? (
                <div className="channels-pending__resubmit">
                  {isEditing ? (
                    <>
                      <textarea
                        className="textarea"
                        rows={3}
                        value={editBody}
                        aria-label={t('channels.writeMessage')}
                        disabled={previewPhase !== 'idle' || actingId != null}
                        onChange={(e) => {
                          setEditBody(e.target.value);
                          if (previewOpen) {
                            setPreviewOpen(false);
                            setPreviewSummary(null);
                          }
                        }}
                      />
                      <div className="row" style={{ gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          disabled={
                            actingId === item.id ||
                            !editBody.trim() ||
                            previewPhase !== 'idle'
                          }
                          onClick={() => void requestResubmitPreview(item)}
                        >
                          {actingId === item.id && previewPhase === 'previewing'
                            ? t('communication.recipients.previewLoading')
                            : t('channels.pendingResubmit')}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          disabled={previewPhase !== 'idle'}
                          onClick={() => {
                            setEditingId(null);
                            setEditBody('');
                            setPreviewOpen(false);
                          }}
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditBody(stripHtmlPreview(contentBody(item), 2000));
                      }}
                    >
                      {t('channels.pendingEditResubmit')}
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <RecipientPreviewDialog
        open={previewOpen}
        summary={previewSummary}
        composeMode="submit"
        loading={previewPhase === 'previewing'}
        confirming={previewPhase === 'submitting'}
        onConfirm={() => void confirmResubmit()}
        onClose={() => {
          if (previewPhase === 'submitting') return;
          setPreviewOpen(false);
          setPreviewSummary(null);
        }}
      />
    </section>
  );
}
