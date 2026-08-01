'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 *
 * Admin create-message entry without student context.
 * Reuses ChannelChat composer; filters by Backend can_send / allowed_message_actions.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EmptyState } from '@/components/states/states';
import { ResourceView } from '@/components/states/resource';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { channelTypeLabel } from '@/lib/utils/labels';
import type { Channel } from '@/types/channel';
import { ChannelChat } from './channel-chat';
import { CHANNELS_LIST_PAGE_SIZE } from './utils/channels-list-present';
import {
  filterSendableChannels,
  parseComposeChannelId,
} from './utils/filter-sendable-channels';

export function AdminCreateMessageWorkspace() {
  const t = useT();
  const searchParams = useSearchParams();
  const parsedChannel = useMemo(
    () => parseComposeChannelId(searchParams),
    [searchParams],
  );

  const listState = useAdminResource<Channel[]>(endpoints.admin.channels, {
    page_size: CHANNELS_LIST_PAGE_SIZE,
  });

  const sendable = useMemo(
    () => filterSendableChannels(listState.data ?? []),
    [listState.data],
  );

  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [ignoreDeepLink, setIgnoreDeepLink] = useState(false);

  useEffect(() => {
    setIgnoreDeepLink(false);
  }, [parsedChannel]);

  useEffect(() => {
    if (!ignoreDeepLink && parsedChannel.ok) {
      setSelectedChannelId(parsedChannel.channelId);
      return;
    }
    if (sendable.length === 1) {
      setSelectedChannelId(sendable[0].id);
      return;
    }
    if (sendable.length === 0) {
      setSelectedChannelId(null);
    }
  }, [parsedChannel, sendable, ignoreDeepLink]);

  function onChannelSelectChange(nextRaw: string) {
    if (!nextRaw) {
      setSelectedChannelId(null);
      return;
    }
    const nextId = Number(nextRaw);
    if (!Number.isInteger(nextId) || nextId <= 0) return;
    if (selectedChannelId != null && selectedChannelId !== nextId) {
      const confirmed = window.confirm(t('channels.compose.confirmChannelChange'));
      if (!confirmed) return;
    }
    setIgnoreDeepLink(true);
    setSelectedChannelId(nextId);
  }

  const selected =
    selectedChannelId != null
      ? (sendable.find((c) => c.id === selectedChannelId) ?? null)
      : null;

  const deepLinkBlocked =
    !ignoreDeepLink &&
    parsedChannel.ok &&
    listState.data != null &&
    !sendable.some((c) => c.id === parsedChannel.channelId);

  return (
    <div className="admin-workspace">
      <Link href="/admin/channels" className="back-link">
        ‹ {t('channels.backToSchoolCommunication')}
      </Link>

      <PageHeader
        title={t('channels.createMessage')}
        subtitle={t('channels.compose.createSubtitle')}
      />

      <ResourceView state={listState} loadingLabel={t('channels.compose.loading')}>
        {() => {
          if (sendable.length === 0) {
            return (
              <EmptyState
                icon="✉"
                title={t('channels.compose.noSendableChannelTitle')}
                description={t('channels.compose.noSendableChannelDesc')}
                action={
                  <Link href="/admin/channels" className="btn btn--ghost btn--sm">
                    {t('channels.compose.openChannels')}
                  </Link>
                }
              />
            );
          }

          if (deepLinkBlocked) {
            return (
              <EmptyState
                icon="🔒"
                title={t('channels.compose.cannotSendSelected')}
                description={t('channels.compose.cannotSendSelectedDesc')}
                action={
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setIgnoreDeepLink(true);
                      setSelectedChannelId(null);
                    }}
                  >
                    {t('channels.compose.selectChannel')}
                  </button>
                }
              />
            );
          }

          return (
            <>
              {sendable.length > 1 ? (
                <div className="card card--pad" style={{ marginBlockEnd: 16 }}>
                  <label
                    htmlFor="admin-create-message-channel"
                    style={{ display: 'block', marginBlockEnd: 6 }}
                  >
                    {t('channels.compose.selectChannel')}
                  </label>
                  <select
                    id="admin-create-message-channel"
                    className="select"
                    value={selectedChannelId ?? ''}
                    onChange={(e) => onChannelSelectChange(e.target.value)}
                    aria-label={t('channels.compose.selectChannel')}
                  >
                    <option value="">{t('channels.compose.selectChannelPlaceholder')}</option>
                    {sendable.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {selectedChannelId == null && sendable.length > 1 ? (
                <EmptyState
                  icon="✉"
                  title={t('channels.compose.selectChannel')}
                  description={t('channels.compose.selectChannelHint')}
                />
              ) : null}

              {selected ? (
                <>
                  <div className="wrap-gap" style={{ marginBlockEnd: 12 }}>
                    <strong dir="auto">{selected.name}</strong>
                    <Badge tone="slate">{channelTypeLabel(t, selected.type)}</Badge>
                    {selected.is_internal_staff_only ? (
                      <Badge tone="blue">{t('channels.internalStaffOnly')}</Badge>
                    ) : null}
                    {selected.requires_message_moderation ? (
                      <Badge tone="amber">{t('channels.moderationRequired')}</Badge>
                    ) : null}
                  </div>
                  <ChannelChat
                    key={selected.id}
                    channelId={selected.id}
                    composerAutofocus
                  />
                </>
              ) : null}
            </>
          );
        }}
      </ResourceView>
    </div>
  );
}
