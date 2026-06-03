'use client';

import { PageHeader } from '@/components/ui/primitives';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { AdminTimetablePanel } from '@/features/admin/admin-timetable-panel';
import { useT } from '@/features/i18n/locale-context';

export default function AdminTimetablePage() {
  const t = useT();

  return (
    <RequireAdminPermission permission="view_timetable">
      <>
        <PageHeader title={t('timetable.title')} subtitle={t('admin.timetableDesc')} />
        <AdminTimetablePanel />
      </>
    </RequireAdminPermission>
  );
}
