'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 *
 * Admin published-message feed for school communication.
 * Create reuses the existing /admin/channels/compose journey (no second composer).
 */

import Link from 'next/link';
import { AnnouncementsRecipientFeed } from '@/features/announcements/components/announcements-recipient-feed';
import { useSession } from '@/features/auth/session-context';
import { adminCreateMessageHref } from '@/features/channels/utils/filter-sendable-channels';
import { useT } from '@/features/i18n/locale-context';
import { canSeeChannels } from '@/lib/permissions/scope';

export default function AdminAnnouncementsPage() {
  const t = useT();
  const user = useSession();
  const canOpenCreate = canSeeChannels(user);

  return (
    <div className="admin-workspace">
      <AnnouncementsRecipientFeed
        basePath="/admin/announcements"
        title={t('channels.schoolCommunicationTitle')}
        subtitle={t('announcements.adminWorkspaceSubtitle')}
        actions={
          canOpenCreate ? (
            <Link
              href={adminCreateMessageHref()}
              className="btn btn--primary"
              aria-label={t('channels.createMessage')}
            >
              {t('channels.createMessage')}
            </Link>
          ) : null
        }
      />
    </div>
  );
}
