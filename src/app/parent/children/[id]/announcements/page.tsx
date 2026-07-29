'use client';

import { use } from 'react';
import Link from 'next/link';
import { AnnouncementsRecipientFeed } from '@/features/announcements/components/announcements-recipient-feed';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { useT } from '@/features/i18n/locale-context';

export default function ChildAnnouncementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const studentId = Number(id);
  const basePath = `/parent/children/${id}/announcements`;

  return (
    <>
      <Link href={`/parent/children/${id}`} className="back-link">
        ‹ {t('common.backToChild')}
      </Link>
      <ChildSubnav id={id} />
      {Number.isFinite(studentId) && studentId > 0 ? (
        <AnnouncementsRecipientFeed
          basePath={basePath}
          studentId={studentId}
          subtitle={t('parent.childAnnouncementsSubtitle')}
        />
      ) : null}
    </>
  );
}
