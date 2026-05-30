'use client';

import { use } from 'react';
import Link from 'next/link';
import { ChannelChat } from '@/features/channels/channel-chat';

export default function StudentChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <>
      <Link href="/student/channels" className="back-link">
        ‹ Back to channels
      </Link>
      {/* Student can send only where the server reports can_send=true. */}
      <ChannelChat channelId={Number(id)} />
    </>
  );
}
