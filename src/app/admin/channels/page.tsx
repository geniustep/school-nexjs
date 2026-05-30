'use client';

import { PageHeader } from '@/components/ui/primitives';
import { ChannelsList } from '@/features/channels/channels-list';

export default function AdminChannelsPage() {
  return (
    <>
      <PageHeader title="Channels" subtitle="Conversations and announcements within your access" />
      <ChannelsList basePath="/admin/channels" />
    </>
  );
}
