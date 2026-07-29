'use client';

import { AnnouncementsRecipientFeed } from '@/features/announcements/components/announcements-recipient-feed';
import { useT } from '@/features/i18n/locale-context';

export default function TeacherAnnouncementsPage() {
  const t = useT();
  return (
    <AnnouncementsRecipientFeed
      basePath="/teacher/announcements"
      subtitle={t('announcements.teacherSubtitle')}
    />
  );
}
