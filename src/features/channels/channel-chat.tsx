'use client';

// Shared channel detail + messages + composer. The composer is shown ONLY when
// the channel's server-provided can_send is true (API_REPORT.md §3, §6). When
// forceReadOnly is set (parent child-view), sending is disabled regardless.

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useSession } from '@/features/auth/session-context';
import { channelsEndpointsForRole } from '@/lib/api/channel-endpoints';
import { ResourceView } from '@/components/states/resource';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { Badge } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { CHANNEL_TYPE_LABEL } from '@/lib/utils/labels';
import { formatDateTime } from '@/lib/utils/format';
import type { Channel } from '@/types/channel';
import type { Message } from '@/types/message';
import type { ApiErrorBody } from '@/types/api';

const POLL_MS = 30000;

export function ChannelChat({
  channelId,
  forceReadOnly = false,
}: {
  channelId: number;
  forceReadOnly?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const user = useSession();
  const ch = channelsEndpointsForRole(user.role);
  const isAdmin = user.role === 'admin';
  const adminChannelState = useAdminResource<Channel>(
    isAdmin ? ch.detail(channelId) : null,
  );
  const portalChannelState = useResource<Channel>(!isAdmin ? ch.detail(channelId) : null);
  const channelState = isAdmin ? adminChannelState : portalChannelState;

  const [messages, setMessages] = useState<Message[]>([]);
  const [msgError, setMsgError] = useState<ApiErrorBody | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadMessages(scroll = false) {
    const res = await api.get<Message[]>(ch.messages(channelId), {
      page_size: 100,
    });
    if (res.success) {
      setMessages(res.data);
      setMsgError(null);
      if (scroll) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        });
      }
    } else {
      setMsgError(res.error);
    }
    setLoadingMsgs(false);
  }

  useEffect(() => {
    loadMessages(true);
    const timer = setInterval(() => loadMessages(false), POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const res = await api.post<Message>(ch.messages(channelId), {
      body: text,
    });
    setSending(false);
    if (res.success) {
      setBody('');
      await loadMessages(true);
    } else if (res.error.code === 'permission_denied') {
      toast.error(t('channels.permissionDenied'));
    } else {
      toast.error(res.error.message || t('channels.sendFailed'));
    }
  }

  return (
    <ResourceView state={channelState} loadingLabel={t('channels.loadingChannel')}>
      {(channel) => {
        const canSend =
          !forceReadOnly &&
          channel.can_send &&
          (user.role !== 'admin' || hasPermission(user, 'send_messages'));
        const typeLabel = CHANNEL_TYPE_LABEL[channel.type] ?? channel.type;
        return (
          <div className="card chat" style={{ padding: 0 }}>
            <div
              className="card--pad between"
              style={{ borderBottom: '1px solid var(--c-border)' }}
            >
              <div>
                <div className="row" style={{ gap: 8, marginBlockEnd: 6 }}>
                  <strong style={{ fontSize: 15 }}>{channel.name}</strong>
                  {!canSend && <Badge tone="amber">{t('channels.readOnly')}</Badge>}
                </div>
                <div className="wrap-gap">
                  <Badge tone="slate">{typeLabel}</Badge>
                </div>
              </div>
              <span className="tiny faint">
                {channel.member_count} {t('channels.members')}
              </span>
            </div>

            <div className="chat__messages" ref={scrollRef}>
              {loadingMsgs ? (
                <LoadingState label={t('channels.loadingMessages')} />
              ) : msgError ? (
                <ApiErrorView error={msgError} onRetry={() => loadMessages(false)} />
              ) : messages.length === 0 ? (
                <EmptyState
                  icon="✉"
                  title={t('channels.noMessagesTitle')}
                  description={
                    canSend ? t('channels.noMessagesCanSend') : t('channels.noMessagesReadOnly')
                  }
                />
              ) : (
                messages.map((m) => (
                  <div className="msg" key={m.id}>
                    <div className="msg__meta">
                      <span className="msg__sender">{m.sender.name}</span>
                      {m.is_important && <Badge tone="red">{t('channels.important')}</Badge>}
                      {m.is_pinned && <Badge tone="amber">{t('channels.pinned')}</Badge>}
                      <span className="msg__time">{formatDateTime(m.created_at)}</span>
                    </div>
                    <div className="msg__body">{m.body}</div>
                  </div>
                ))
              )}
            </div>

            {canSend ? (
              <form className="chat__composer" onSubmit={send}>
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder={t('channels.writeMessage')}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(e);
                    }
                  }}
                />
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={sending || !body.trim()}
                >
                  {sending ? t('channels.sending') : t('channels.send')}
                </button>
              </form>
            ) : (
              <div className="chat__readonly">
                <span className="chat__readonly-icon" aria-hidden="true">&#128274;</span>
                {forceReadOnly ? t('channels.parentReadOnly') : t('channels.readOnlyChannel')}
              </div>
            )}
          </div>
        );
      }}
    </ResourceView>
  );
}
