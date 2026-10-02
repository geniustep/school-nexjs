/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 * New isolated Finance Command Center. Legacy /admin/finance remains untouched.
 */
'use client';

import '@/features/admin/finance/command-center/command-center.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { FinanceCommandCenterPage } from '@/features/admin/finance/command-center/finance-command-center-page';
import { FINANCE_VIEW_STUDENT_BALANCE } from '@/lib/permissions/finance';

export default function AdminFinanceCommandCenterPage() {
  return (
    <RequireAdminPermission permission={FINANCE_VIEW_STUDENT_BALANCE}>
      <FinanceCommandCenterPage />
    </RequireAdminPermission>
  );
}
