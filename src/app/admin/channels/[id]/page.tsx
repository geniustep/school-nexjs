'use client';

import { use } from 'react';
import Link from 'next/link';
import { ChannelChat } from '@/features/channels/channel-chat';

export default function AdminChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <>
      <Link href="/admin/channels" className="back-link">
        ‹ Back to channels
      </Link>
      <ChannelChat channelId={Number(id)} />
    </>
  );
}
