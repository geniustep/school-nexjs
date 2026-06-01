'use client';

// Shared channel list. Used by admin/teacher/parent/student channel pages.
// `basePath` controls where a channel links (e.g. /teacher/channels).

import { useRouter } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { Badge, Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { CHANNEL_TYPE_LABEL } from '@/lib/utils/labels';
import { formatDateTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { Channel } from '@/types/channel';

export function ChannelsList({ basePath }: { basePath: string }) {
  const t = useT();
  const router = useRouter();
  const state = useResource<Channel[]>(endpoints.channels.list, { page_size: 100 });

  return (
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
        <div className="grid grid--cards">
          {channels.map((ch) => (
            <Card
              key={ch.id}
              className={cn('row-link', `channel-card--${ch.type}`)}
              pad
            >
              <div
                onClick={() => router.push(`${basePath}/${ch.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="between" style={{ marginBlockEnd: 8 }}>
                  <strong style={{ fontSize: 14 }}>{ch.name}</strong>
                  {ch.unread_count > 0 && (
                    <Badge tone="blue">{t('channels.newCount', { count: ch.unread_count })}</Badge>
                  )}
                </div>

                <div className="wrap-gap" style={{ marginBlockEnd: 8 }}>
                  <Badge tone="slate">
                    {CHANNEL_TYPE_LABEL[ch.type] ?? ch.type}
                  </Badge>
                  {ch.read_only && <Badge tone="amber">{t('channels.readOnly')}</Badge>}
                  {!ch.can_send && !ch.read_only && (
                    <Badge tone="slate">{t('channels.viewOnly')}</Badge>
                  )}
                </div>

                {ch.description && (
                  <p className="muted tiny" style={{ marginBlock: '4px 6px' }}>
                    {ch.description}
                  </p>
                )}

                <div className="tiny faint">
                  {ch.member_count}{' '}
                  {ch.member_count === 1 ? t('channels.member') : t('channels.members')}
                  {' · '}
                  {ch.last_message_date
                    ? t('channels.activeAt', { date: formatDateTime(ch.last_message_date) })
                    : t('channels.noMessagesYet')}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </ResourceView>
  );
}
