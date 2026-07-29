'use client';

import { AnnouncementsRecipientFeed } from '@/features/announcements/components/announcements-recipient-feed';
import { useT } from '@/features/i18n/locale-context';

export default function AdminAnnouncementsPage() {
  const t = useT();
  return (
    <div className="admin-workspace">
      <AnnouncementsRecipientFeed
        basePath="/admin/announcements"
        subtitle={t('announcements.adminSubtitle')}
      />
    </div>
  );
}
