'use client';

import { use } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/primitives';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { AnnouncementsFeed } from '@/features/announcements/announcements-feed';
import { endpoints } from '@/lib/api/endpoints';

export default function ChildAnnouncementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <>
      <Link href={`/parent/children/${id}`} className="back-link">
        ‹ Back to child
      </Link>
      <PageHeader title="Announcements" subtitle="Messages visible to your child (read-only)" />
      <ChildSubnav id={id} />
      <AnnouncementsFeed path={endpoints.parent.childAnnouncements(id)} />
    </>
  );
}
