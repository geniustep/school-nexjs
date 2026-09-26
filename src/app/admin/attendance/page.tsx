'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { Suspense } from 'react';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { AdminAttendanceOperationsCenter } from '@/features/admin/attendance/admin-attendance-operations-center';
import { useT } from '@/features/i18n/locale-context';

export default function AdminAttendancePage() {
  const t = useT();
  return (
    <RequireAdminPermission permission="view_attendance">
      <Suspense fallback={<p className="admin-att-loading">{t('admin.attendanceCenter.loading')}</p>}>
        <AdminAttendanceOperationsCenter />
      </Suspense>
    </RequireAdminPermission>
  );
}
