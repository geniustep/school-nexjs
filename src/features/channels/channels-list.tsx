'use client';

// Shared channel list. Used by admin/teacher/parent/student channel pages.
// `basePath` controls where a channel links (e.g. /teacher/channels).

import { useRouter } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { Badge, Card } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import { CHANNEL_TYPE_LABEL } from '@/lib/utils/labels';
import { formatDateTime } from '@/lib/utils/format';
import type { Channel } from '@/types/channel';

export function ChannelsList({ basePath }: { basePath: string }) {
  const router = useRouter();
  const state = useResource<Channel[]>(endpoints.channels.list, { page_size: 100 });

  return (
    <ResourceView
      state={state}
      loadingLabel="Loading channels…"
      isEmpty={(d) => d.length === 0}
      empty={
        <EmptyState
          icon="💬"
          title="No channels yet"
          description="Channels you can access will appear here."
        />
      }
    >
      {(channels) => (
        <div className="grid grid--cards">
          {channels.map((ch) => (
            <Card
              key={ch.id}
              className="row-link"
              pad
            >
              <div
                onClick={() => router.push(`${basePath}/${ch.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="between">
                  <strong>{ch.name}</strong>
                  {ch.unread_count > 0 && <Badge tone="blue">{ch.unread_count} new</Badge>}
                </div>
                <div className="wrap-gap mt-2">
                  <Badge tone="slate">
                    {CHANNEL_TYPE_LABEL[ch.type] ?? ch.type}
                  </Badge>
                  {ch.read_only && <Badge tone="amber">Read-only</Badge>}
                  {!ch.can_send && !ch.read_only && <Badge tone="slate">View only</Badge>}
                </div>
                {ch.description && <p className="muted tiny mt-2">{ch.description}</p>}
                <div className="tiny faint mt-2">
                  {ch.member_count} members ·{' '}
                  {ch.last_message_date
                    ? `Last activity ${formatDateTime(ch.last_message_date)}`
                    : 'No messages yet'}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </ResourceView>
  );
}
