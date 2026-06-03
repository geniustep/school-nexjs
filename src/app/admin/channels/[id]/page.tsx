'use client';

import { use } from 'react';
import Link from 'next/link';
import { ChannelChat } from '@/features/channels/channel-chat';
import { useT } from '@/features/i18n/locale-context';

export default function AdminChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  return (
    <>
      <Link href="/admin/channels" className="back-link">
        ‹ {t('channels.backToChannels')}
      </Link>
      <ChannelChat channelId={Number(id)} />
    </>
  );
}
