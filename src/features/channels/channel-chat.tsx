'use client';

// Shared channel detail + messages + composer. The composer is shown ONLY when
// the channel's server-provided can_send is true (API_REPORT.md §3, §6). When
// forceReadOnly is set (parent child-view), sending is disabled regardless.

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { Badge } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { endpoints } from '@/lib/api/endpoints';
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
  const toast = useToast();
  const channelState = useResource<Channel>(endpoints.channels.detail(channelId));

  const [messages, setMessages] = useState<Message[]>([]);
  const [msgError, setMsgError] = useState<ApiErrorBody | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadMessages(scroll = false) {
    const res = await api.get<Message[]>(endpoints.channels.messages(channelId), {
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
    const t = setInterval(() => loadMessages(false), POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const res = await api.post<Message>(endpoints.channels.messages(channelId), {
      body: text,
    });
    setSending(false);
    if (res.success) {
      setBody('');
      await loadMessages(true);
    } else if (res.error.code === 'permission_denied') {
      toast.error('You cannot send messages in this channel.');
    } else {
      toast.error(res.error.message || 'Could not send your message.');
    }
  }

  return (
    <ResourceView state={channelState} loadingLabel="Loading channel…">
      {(channel) => {
        const canSend = !forceReadOnly && channel.can_send;
        const typeLabel = CHANNEL_TYPE_LABEL[channel.type] ?? channel.type;
        return (
          <div className="card chat" style={{ padding: 0 }}>
            {/* Channel header */}
            <div
              className="card--pad between"
              style={{ borderBottom: '1px solid var(--c-border)' }}
            >
              <div>
                <div className="row" style={{ gap: 8, marginBlockEnd: 6 }}>
                  <strong style={{ fontSize: 15 }}>{channel.name}</strong>
                  {!canSend && <Badge tone="amber">Read-only</Badge>}
                </div>
                <div className="wrap-gap">
                  <Badge tone="slate">{typeLabel}</Badge>
                </div>
              </div>
              <span className="tiny faint">{channel.member_count} members</span>
            </div>

            {/* Messages */}
            <div className="chat__messages" ref={scrollRef}>
              {loadingMsgs ? (
                <LoadingState label="Loading messages…" />
              ) : msgError ? (
                <ApiErrorView error={msgError} onRetry={() => loadMessages(false)} />
              ) : messages.length === 0 ? (
                <EmptyState
                  icon="✉"
                  title="No messages yet"
                  description={canSend ? 'Be the first to post a message.' : 'No messages in this channel yet.'}
                />
              ) : (
                messages.map((m) => (
                  <div className="msg" key={m.id}>
                    <div className="msg__meta">
                      <span className="msg__sender">{m.sender.name}</span>
                      {m.is_important && <Badge tone="red">Important</Badge>}
                      {m.is_pinned && <Badge tone="amber">Pinned</Badge>}
                      <span className="msg__time">{formatDateTime(m.created_at)}</span>
                    </div>
                    <div className="msg__body">{m.body}</div>
                  </div>
                ))
              )}
            </div>

            {/* Composer — shown only when can_send is true */}
            {canSend ? (
              <form className="chat__composer" onSubmit={send}>
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder="Write a message…"
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
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </form>
            ) : (
              <div className="chat__readonly">
                <span className="chat__readonly-icon" aria-hidden="true">&#128274;</span>
                {forceReadOnly
                  ? 'You are viewing this channel as a parent. Messages cannot be sent from here.'
                  : 'This channel is read-only. You cannot send messages here.'}
              </div>
            )}
          </div>
        );
      }}
    </ResourceView>
  );
}
