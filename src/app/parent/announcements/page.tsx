'use client';

import { AnnouncementsRecipientFeed } from '@/features/announcements/components/announcements-recipient-feed';
import { useT } from '@/features/i18n/locale-context';

export default function ParentAnnouncementsPage() {
  const t = useT();
  return (
    <AnnouncementsRecipientFeed
      basePath="/parent/announcements"
      subtitle={t('announcements.parentSubtitle')}
    />
  );
}
