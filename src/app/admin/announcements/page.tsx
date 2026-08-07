'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 *
 * Admin published-message feed for school communication.
 * Create opens general communication compose (recipient scopes), not channel compose.
 */

import Link from 'next/link';
import { AnnouncementsRecipientFeed } from '@/features/announcements/components/announcements-recipient-feed';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { canComposeGeneralCommunication } from '@/lib/permissions/communication';

export default function AdminAnnouncementsPage() {
  const t = useT();
  const user = useSession();
  const canOpenCreate = canComposeGeneralCommunication(user);

  return (
    <div className="admin-workspace">
      <AnnouncementsRecipientFeed
        basePath="/admin/announcements"
        title={t('channels.schoolCommunicationTitle')}
        subtitle={t('announcements.adminWorkspaceSubtitle')}
        actions={
          canOpenCreate ? (
            <Link
              href="/admin/communication/compose"
              className="btn btn--primary"
              aria-label={t('communication.general.newCommunication')}
            >
              {t('communication.general.newCommunication')}
            </Link>
          ) : null
        }
      />
    </div>
  );
}
