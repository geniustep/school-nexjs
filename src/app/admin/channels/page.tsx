'use client';

import { PageHeader } from '@/components/ui/primitives';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ChannelsList } from '@/features/channels/channels-list';
import { useT } from '@/features/i18n/locale-context';

export default function AdminChannelsPage() {
  const t = useT();
  return (
    <RequireAdminPermission permission="view_channels">
      <>
        <PageHeader title={t('nav.channels')} subtitle={t('admin.channelsListDesc')} />
        <ChannelsList basePath="/admin/channels" />
      </>
    </RequireAdminPermission>
  );
}
