'use client';

import { PageHeader } from '@/components/ui/primitives';
import { ChannelsList } from '@/features/channels/channels-list';
import { useT } from '@/features/i18n/locale-context';

export default function StudentChannelsPage() {
  const t = useT();
  return (
    <>
      <PageHeader
        title={t('channels.title')}
        subtitle={t('studentPortal.channelsSubtitle')}
      />
      <ChannelsList basePath="/student/channels" />
    </>
  );
}
