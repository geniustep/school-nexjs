'use client';

import { PageHeader } from '@/components/ui/primitives';
import { ChannelsList } from '@/features/channels/channels-list';

export default function StudentChannelsPage() {
  return (
    <>
      <PageHeader title="Channels" subtitle="Channels available to you" />
      <ChannelsList basePath="/student/channels" />
    </>
  );
}
