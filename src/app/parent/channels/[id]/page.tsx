'use client';

import { use } from 'react';
import Link from 'next/link';
import { ChannelChat } from '@/features/channels/channel-chat';
import { useT } from '@/features/i18n/locale-context';

export default function ParentChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  return (
    <>
      <Link href="/parent/channels" className="back-link">
        ‹ {t('channels.backToChannels')}
      </Link>
      {/* Parent can send only where the server reports can_send=true. */}
      <ChannelChat channelId={Number(id)} />
    </>
  );
}
