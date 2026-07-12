import { requireAdminAnyPermission } from '@/lib/auth/require-admin-permission';
import {
  FINANCE_VIEW,
  FINANCE_VIEW_CASH_SESSIONS,
  FINANCE_VIEW_CHEQUES,
} from '@/lib/permissions/finance';

/** Server gate for finance workspace — before any nested client fetch. */
export default async function AdminFinanceLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAnyPermission([
    FINANCE_VIEW,
    FINANCE_VIEW_CHEQUES,
    FINANCE_VIEW_CASH_SESSIONS,
  ]);
  return children;
}
