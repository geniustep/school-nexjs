'use client';

import { PageHeader } from '@/components/ui/primitives';
import { ChannelsList } from '@/features/channels/channels-list';

export default function TeacherChannelsPage() {
  return (
    <>
      <PageHeader title="Channels" subtitle="Your conversations and announcements" />
      <ChannelsList basePath="/teacher/channels" />
    </>
  );
}
