'use client';

import { use } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/primitives';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { AnnouncementsFeed } from '@/features/announcements/announcements-feed';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';

export default function ChildAnnouncementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  return (
    <>
      <Link href={`/parent/children/${id}`} className="back-link">
        ‹ {t('common.backToChild')}
      </Link>
      <PageHeader
        title={t('nav.announcements')}
        subtitle={t('parent.childAnnouncementsSubtitle')}
      />
      <ChildSubnav id={id} />
      <AnnouncementsFeed path={endpoints.parent.childAnnouncements(id)} />
    </>
  );
}
