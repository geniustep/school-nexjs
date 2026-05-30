'use client';

// Child channels — read-only list. Every entry has can_send=false
// (API_REPORT.md §5), so there is no message composer and no chat entry: the
// parent may not act as the child. The child's message feed is shown under
// Announcements instead.

import { use } from 'react';
import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card, Badge } from '@/components/ui/primitives';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { endpoints } from '@/lib/api/endpoints';
import { CHANNEL_TYPE_LABEL } from '@/lib/utils/labels';
import type { Channel } from '@/types/channel';

export default function ChildChannelsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const state = useResource<Channel[]>(endpoints.parent.childChannels(id));

  return (
    <>
      <Link href={`/parent/children/${id}`} className="back-link">
        ‹ Back to child
      </Link>
      <PageHeader title="Channels" subtitle="Channels visible to your child (read-only)" />
      <ChildSubnav id={id} />

      <ResourceView
        state={state}
        loadingLabel="Loading channels…"
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="💬" title="No channels" />}
      >
        {(channels) => (
          <div className="grid grid--cards">
            {channels.map((ch) => (
              <Card key={ch.id}>
                <div className="between">
                  <strong>{ch.name}</strong>
                  <Badge tone="slate">{CHANNEL_TYPE_LABEL[ch.type] ?? ch.type}</Badge>
                </div>
                {ch.description && <p className="muted tiny mt-2">{ch.description}</p>}
                <div className="mt-2">
                  <Badge tone="amber">Read-only</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
