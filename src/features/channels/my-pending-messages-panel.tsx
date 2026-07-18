'use client';

import { useCallback, useEffect, useState } from 'react';
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
import {
  communicationStateMessageKey,
  stripHtmlPreview,
} from '@/features/communication/utils/communication-labels';
import type { ApiErrorBody } from '@/types/api';
import type { CommunicationContent } from '@/types/communication';

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
  const endpoints = channelsEndpointsForRole(user.role);
  const [items, setItems] = useState<CommunicationContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState('');
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<CommunicationContent[]>(endpoints.myPendingMessages(channelId), {
      page: 1,
      limit: 50,
    });
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
  }, [channelId, endpoints]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  async function resubmit(item: CommunicationContent) {
    const text = editBody.trim();
    if (!text || actingId != null) return;
    setActingId(item.id);
    const res = await api.post(endpoints.pendingMessageResubmit(channelId, item.id), {
      body: text,
    });
    setActingId(null);
    if (!res.success) {
      const key = communicationErrorMessageKey(res.error.code);
      toast.error(key ? t(key) : res.error.message || t('channels.sendFailed'));
      // Keep edit text on failure.
      if (
        res.error.code === 'communication_message_audience_changed' ||
        res.error.code === 'communication_invalid_transition'
      ) {
        void load();
      }
      return;
    }
    toast.success(t('channels.pendingResubmitSuccess'));
    setEditingId(null);
    setEditBody('');
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
                        onChange={(e) => setEditBody(e.target.value)}
                      />
                      <div className="row" style={{ gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          disabled={actingId === item.id || !editBody.trim()}
                          onClick={() => void resubmit(item)}
                        >
                          {actingId === item.id
                            ? t('channels.sending')
                            : t('channels.pendingResubmit')}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditBody('');
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
    </section>
  );
}
