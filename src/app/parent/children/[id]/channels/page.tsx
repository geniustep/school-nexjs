'use client';

import { use } from 'react';
import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card, Badge } from '@/components/ui/primitives';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { useT } from '@/features/i18n/locale-context';
import { channelTypeLabel } from '@/lib/utils/labels';
import { endpoints } from '@/lib/api/endpoints';
import type { Channel } from '@/types/channel';

export default function ChildChannelsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useResource<Channel[]>(endpoints.parent.childChannels(id));

  return (
    <>
      <Link href={`/parent/children/${id}`} className="back-link">
        ‹ {t('common.backToChild')}
      </Link>
      <PageHeader
        title={t('channels.title')}
        subtitle={t('parent.childChannelsSubtitle')}
      />
      <ChildSubnav id={id} />

      <ResourceView
        state={state}
        loadingLabel={t('channels.loadingChannels')}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="💬" title={t('channels.emptyTitle')} />}
      >
        {(channels) => (
          <div className="grid grid--cards">
            {channels.map((ch) => (
              <Card key={ch.id}>
                <div className="between">
                  <strong>{ch.name}</strong>
                  <Badge tone="slate">{channelTypeLabel(t, ch.type)}</Badge>
                </div>
                <div className="mt-2">
                  <Badge tone="amber">{t('channels.readOnly')}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
