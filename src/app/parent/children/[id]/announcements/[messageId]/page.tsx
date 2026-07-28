'use client';

import { use } from 'react';
import Link from 'next/link';
import { AnnouncementRecipientDetail } from '@/features/announcements/components/announcement-recipient-detail';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { useT } from '@/features/i18n/locale-context';

export default function ChildAnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string; messageId: string }>;
}) {
  const { id, messageId: rawMessageId } = use(params);
  const t = useT();
  const studentId = Number(id);
  const messageId = Number(rawMessageId);

  return (
    <>
      <Link href={`/parent/children/${id}`} className="back-link">
        ‹ {t('common.backToChild')}
      </Link>
      <ChildSubnav id={id} />
      <AnnouncementRecipientDetail
        messageId={Number.isFinite(messageId) ? messageId : 0}
        studentId={Number.isFinite(studentId) && studentId > 0 ? studentId : undefined}
        backHref={`/parent/children/${id}/announcements`}
        backLabel={t('nav.announcements')}
      />
    </>
  );
}
