'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/ui/primitives';
import { AdminTimetablePanel } from '@/features/admin/admin-timetable-panel';
import { useT } from '@/features/i18n/locale-context';

export default function AdminTimetablePage() {
  const t = useT();

  return (
    <>
      <Link href="/admin/academic" className="back-link">
        ‹ {t('admin.academicCenter')}
      </Link>
      <PageHeader title={t('timetable.title')} subtitle={t('admin.timetableDesc')} />
      <AdminTimetablePanel />
    </>
  );
}
