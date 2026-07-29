'use client';

import { use } from 'react';
import { AnnouncementRecipientDetail } from '@/features/announcements/components/announcement-recipient-detail';
import { useT } from '@/features/i18n/locale-context';

export default function ParentAnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const messageId = Number(id);
  return (
    <AnnouncementRecipientDetail
      messageId={Number.isFinite(messageId) ? messageId : 0}
      backHref="/parent/announcements"
      backLabel={t('nav.announcements')}
    />
  );
}
