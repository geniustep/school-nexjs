'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { CashDeskWorkspace } from '@/features/admin/finance/cash-desk/cash-desk-workspace';
import { FINANCE_VIEW_CASH_SESSIONS } from '@/lib/permissions/finance';
import { isSafeInternalReturnPath } from '@/lib/utils/safe-return-url';

export default function AdminCashDeskPage() {
  const searchParams = useSearchParams();
  const rawReturnTo = searchParams.get('returnTo');
  const returnTo = isSafeInternalReturnPath(rawReturnTo) ? rawReturnTo : null;

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_CASH_SESSIONS}>
      <CashDeskWorkspace returnTo={returnTo} />
    </RequireAdminPermission>
  );
}
