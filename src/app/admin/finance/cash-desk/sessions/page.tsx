'use client';

import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { CashDeskSessionsListPanel } from '@/features/admin/finance/cash-desk/cash-desk-sessions-list-panel';
import { FINANCE_VIEW_CASH_SESSIONS } from '@/lib/permissions/finance';

export default function CashDeskSessionsPage() {
  return (
    <RequireAdminPermission permission={FINANCE_VIEW_CASH_SESSIONS}>
      <CashDeskSessionsListPanel />
    </RequireAdminPermission>
  );
}
