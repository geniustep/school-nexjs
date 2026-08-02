'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { PageHeader } from '@/components/ui/primitives';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ChannelsList } from '@/features/channels/channels-list';
import { adminCreateMessageHref } from '@/features/channels/utils/filter-sendable-channels';
import { useT } from '@/features/i18n/locale-context';

export default function AdminChannelsPage() {
  const t = useT();
  return (
    <RequireAdminPermission permission="view_channels">
      <div className="admin-workspace">
        <PageHeader
          title={t('channels.schoolCommunicationTitle')}
          subtitle={t('admin.channelsListDesc')}
          actions={
            <Link
              href={adminCreateMessageHref()}
              className="btn btn--primary"
              aria-label={t('channels.createMessage')}
            >
              {t('channels.createMessage')}
            </Link>
          }
        />
        <ChannelsList basePath="/admin/channels" />
      </div>
    </RequireAdminPermission>
  );
}
