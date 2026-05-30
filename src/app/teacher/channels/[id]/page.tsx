'use client';

import { use } from 'react';
import Link from 'next/link';
import { ChannelChat } from '@/features/channels/channel-chat';

export default function TeacherChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <>
      <Link href="/teacher/channels" className="back-link">
        ‹ Back to channels
      </Link>
      <ChannelChat channelId={Number(id)} />
    </>
  );
}
