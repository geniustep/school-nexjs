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
        return (
          <div className="card chat" style={{ padding: 0 }}>
            <div className="card--pad between" style={{ borderBottom: '1px solid var(--c-border)' }}>
              <div>
                <strong>{channel.name}</strong>
                <div className="wrap-gap mt-2">
                  <Badge tone="slate">{CHANNEL_TYPE_LABEL[channel.type] ?? channel.type}</Badge>
                  {!canSend && <Badge tone="amber">Read-only</Badge>}
                </div>
              </div>
              <span className="tiny faint">{channel.member_count} members</span>
            </div>

            <div className="chat__messages" ref={scrollRef}>
              {loadingMsgs ? (
                <LoadingState label="Loading messages…" />
              ) : msgError ? (
                <ApiErrorView error={msgError} onRetry={() => loadMessages(false)} />
              ) : messages.length === 0 ? (
                <EmptyState icon="✉️" title="No messages yet" description="Be the first to post." />
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
                <button className="btn btn--primary" type="submit" disabled={sending || !body.trim()}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </form>
            ) : (
              <div className="chat__readonly">
                🔒 This channel is read-only for you.
              </div>
            )}
          </div>
        );
      }}
    </ResourceView>
  );
}
