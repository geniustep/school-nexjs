'use client';

// Shared channel detail + messages + composer. The composer is shown ONLY when
// the channel's server-provided can_send / allowed_message_actions allow it.
// Pending (HTTP 202) submissions never appear in the published message list.

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { useSession } from '@/features/auth/session-context';
import { channelsEndpointsForRole } from '@/lib/api/channel-endpoints';
import { ResourceView } from '@/components/states/resource';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { channelTypeLabel } from '@/lib/utils/labels';
import { formatDateTime } from '@/lib/utils/format';
import type { AdminChannel } from '@/types/admin-channel';
import type { Channel } from '@/types/channel';
import type { Message } from '@/types/message';
import type { ApiErrorBody } from '@/types/api';
import { ChannelMessageComposer } from './channel-message-composer';
import { useVisibleInterval } from './hooks/use-visible-interval';
import { MyPendingMessagesPanel } from './my-pending-messages-panel';
import { channelAllowsCompose, channelComposeMode } from './utils/channel-composer-actions';
import {
  mergePublishedMessages,
  normalizePublishedMessage,
} from './utils/normalize-send-message-result';
import { resolveAdminChannel } from './utils/resolve-admin-channel';
import { ChannelAudienceSummary } from './components/channel-audience-summary';
import './channels-pending.css';
import './admin-channels-lifecycle.css';

/** Published message list refresh while the channel detail stays open and visible. */
const POLL_MS = 30000;

export function ChannelChat({
  channelId,
  forceReadOnly = false,
  composerAutofocus = false,
}: {
  channelId: number;
  forceReadOnly?: boolean;
  composerAutofocus?: boolean;
}) {
  const t = useT();
  const user = useSession();
  const ch = channelsEndpointsForRole(user.role);
  const isAdmin = user.role === 'admin';
  const portalChannelState = useResource<Channel>(!isAdmin ? ch.detail(channelId) : null);

  const [adminChannel, setAdminChannel] = useState<AdminChannel | null>(null);
  const [adminChannelError, setAdminChannelError] = useState<ApiErrorBody | null>(null);
  const [adminChannelLoading, setAdminChannelLoading] = useState(isAdmin);

  const [messages, setMessages] = useState<Message[]>([]);
  const [msgError, setMsgError] = useState<ApiErrorBody | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [pendingReloadToken, setPendingReloadToken] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesGenerationRef = useRef(0);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setAdminChannelLoading(true);
    void resolveAdminChannel(channelId).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setAdminChannel(res.channel);
        setAdminChannelError(null);
      } else {
        setAdminChannel(null);
        setAdminChannelError(res.error);
      }
      setAdminChannelLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [channelId, isAdmin]);

  const loadMessages = useCallback(
    async (scroll = false) => {
      const generation = messagesGenerationRef.current;
      // Resolve path inside the callback — channelsEndpointsForRole is not referentially stable.
      const endpoints = channelsEndpointsForRole(user.role);
      // Backend 228 admin GET uses page/limit; portal accepts the same shape.
      const res = await api.get<Message[]>(endpoints.messages(channelId), {
        page: 1,
        limit: 100,
      });
      if (generation !== messagesGenerationRef.current) return;
      if (res.success) {
        const normalized = (Array.isArray(res.data) ? res.data : [])
          .map((row) => normalizePublishedMessage(row))
          .filter((m): m is Message => m != null);
        // De-dupe by Message.id; never mix pending content into published list.
        setMessages(mergePublishedMessages([], normalized));
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
    },
    [channelId, user.role],
  );

  useEffect(() => {
    setLoadingMsgs(true);
    void loadMessages(true);
    return () => {
      // Invalidate in-flight fetches on channel switch / unmount.
      messagesGenerationRef.current += 1;
    };
  }, [loadMessages]);

  // One poller per mounted ChannelChat; pauses when the tab is hidden.
  useVisibleInterval(() => loadMessages(false), POLL_MS, true);

  function renderChat(channel: Channel | AdminChannel) {
    const composeAllowed = channelAllowsCompose(channel);
    const canSend =
      !forceReadOnly &&
      composeAllowed &&
      (user.role !== 'admin' || hasPermission(user, 'send_messages'));
    const typeLabel = channelTypeLabel(t, channel.type);
    const adminLike = channel as AdminChannel;
    return (
      <div className="channel-chat-stack">
        {!forceReadOnly ? (
          <MyPendingMessagesPanel channelId={channelId} reloadToken={pendingReloadToken} />
        ) : null}

        <div className="card chat" style={{ padding: 0 }}>
          <div
            className="card--pad between"
            style={{ borderBottom: '1px solid var(--c-border)' }}
          >
            <div>
              <div className="row" style={{ gap: 8, marginBlockEnd: 6 }}>
                <strong style={{ fontSize: 15 }}>{channel.name}</strong>
                {!canSend && <Badge tone="amber">{t('channels.readOnly')}</Badge>}
                {channel.requires_message_moderation ? (
                  <Badge tone="slate">{t('channels.moderationRequired')}</Badge>
                ) : null}
                {channel.is_internal_staff_only ? (
                  <Badge tone="green">{t('channels.internalStaffOnly')}</Badge>
                ) : null}
              </div>
              <div className="wrap-gap">
                <Badge tone="slate">{typeLabel}</Badge>
              </div>
            </div>
            <span className="tiny faint channel-chat__audience">
              {isAdmin ? (
                <ChannelAudienceSummary channel={adminLike} />
              ) : (
                <>
                  {channel.member_count} {t('channels.members')}
                </>
              )}
            </span>
          </div>

          <div className="chat__messages" ref={scrollRef}>
            {loadingMsgs ? (
              <LoadingState label={t('channels.loadingMessages')} />
            ) : msgError ? (
              <ApiErrorView error={msgError} onRetry={() => void loadMessages(false)} />
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
                    {m.is_governed ? (
                      <Badge tone="slate">{t('channels.governedBadge')}</Badge>
                    ) : null}
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
            <ChannelMessageComposer
              channelId={channelId}
              canSend
              autofocus={composerAutofocus}
              composeMode={channelComposeMode(channel)}
              onPublished={async (outcome) => {
                setMessages((prev) => mergePublishedMessages(prev, [outcome.message]));
                requestAnimationFrame(() => {
                  scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
                });
              }}
              onPending={async () => {
                setPendingReloadToken((n) => n + 1);
                // Do not touch published messages or unread locally.
              }}
            />
          ) : (
            <div className="chat__readonly">
              <span className="chat__readonly-icon" aria-hidden="true">
                &#128274;
              </span>
              {forceReadOnly ? t('channels.parentReadOnly') : t('channels.readOnlyChannel')}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isAdmin) {
    if (adminChannelLoading) {
      return <LoadingState label={t('channels.loadingChannel')} />;
    }
    if (!adminChannel) {
      return (
        <ApiErrorView
          error={
            adminChannelError ?? {
              code: 'not_found',
              message: 'Channel not found.',
              details: {},
            }
          }
          onRetry={() => {
            setAdminChannelLoading(true);
            void resolveAdminChannel(channelId).then((res) => {
              if (res.ok) {
                setAdminChannel(res.channel);
                setAdminChannelError(null);
              } else {
                setAdminChannelError(res.error);
              }
              setAdminChannelLoading(false);
            });
          }}
        />
      );
    }
    return renderChat(adminChannel);
  }

  return (
    <ResourceView state={portalChannelState} loadingLabel={t('channels.loadingChannel')}>
      {(channel) => renderChat(channel)}
    </ResourceView>
  );
}
