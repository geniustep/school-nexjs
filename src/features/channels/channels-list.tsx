'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Shared channel list (admin/teacher/parent/student).
 * Cards domain — not a DataTable. `basePath` controls navigation target.
 * Fetches up to CHANNELS_LIST_PAGE_SIZE (100) with no pagination UI (API contract unchanged).
 */

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useSession } from '@/features/auth/session-context';
import { channelsEndpointsForRole } from '@/lib/api/channel-endpoints';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { channelTypeLabel } from '@/lib/utils/labels';
import { formatDateTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { Channel } from '@/types/channel';
import {
  CHANNELS_LIST_PAGE_SIZE,
  channelHasUnread,
  channelTypeAccentClass,
  formatChannelMemberCount,
  resolveChannelAccessPresentation,
} from '@/features/channels/utils/channels-list-present';
import '@/features/channels/channels-list.css';

export function ChannelsList({ basePath }: { basePath: string }) {
  const t = useT();
  const user = useSession();
  const ch = channelsEndpointsForRole(user.role);
  const isAdmin = user.role === 'admin';
  const adminState = useAdminResource<Channel[]>(isAdmin ? ch.list : null, {
    page_size: CHANNELS_LIST_PAGE_SIZE,
  });
  const portalState = useResource<Channel[]>(!isAdmin ? ch.list : null, {
    page_size: CHANNELS_LIST_PAGE_SIZE,
  });
  const state = isAdmin ? adminState : portalState;

  return (
    <div className="channels-list-page">
      <ResourceView
        state={state}
        loadingLabel={t('channels.loadingChannels')}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon="✉"
            title={t('channels.emptyTitle')}
            description={t('channels.emptyDesc')}
          />
        }
      >
        {(channels) => (
          <div className="channels-list__grid">
            {channels.map((channel) => {
              const access = resolveChannelAccessPresentation(channel);

              return (
                <Link
                  key={channel.id}
                  href={`${basePath}/${channel.id}`}
                  className={cn(
                    'card',
                    'card--pad',
                    'channels-list__card',
                    'row-link',
                    channelTypeAccentClass(channel.type),
                  )}
                >
                  <div className="channels-list__head">
                    <strong className="channels-list__name" dir="auto" title={channel.name}>
                      {channel.name}
                    </strong>
                    {channelHasUnread(channel) ? (
                      <Badge tone="blue">
                        <span dir="ltr">
                          {t('channels.newCount', { count: channel.unread_count })}
                        </span>
                      </Badge>
                    ) : null}
                  </div>

                  <div className="channels-list__badges">
                    <Badge tone="slate">{channelTypeLabel(t, channel.type)}</Badge>
                    {access === 'read-only' ? (
                      <Badge tone="amber">{t('channels.readOnly')}</Badge>
                    ) : null}
                    {access === 'view-only' ? (
                      <Badge tone="slate">{t('channels.viewOnly')}</Badge>
                    ) : null}
                  </div>

                  {channel.description ? (
                    <p
                      className="channels-list__description muted tiny"
                      dir="auto"
                      title={channel.description}
                    >
                      {channel.description}
                    </p>
                  ) : null}

                  <div className="channels-list__meta tiny faint">
                    <span className="channels-list__meta-count" dir="ltr">
                      {formatChannelMemberCount(
                        channel.member_count,
                        t('channels.member'),
                        t('channels.members'),
                      )}
                    </span>
                    <span className="channels-list__meta-sep" aria-hidden="true">
                      ·
                    </span>
                    <span className="channels-list__meta-activity" dir="auto">
                      {channel.last_message_date
                        ? t('channels.activeAt', {
                            date: formatDateTime(channel.last_message_date),
                          })
                        : t('channels.noMessagesYet')}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </ResourceView>
    </div>
  );
}
