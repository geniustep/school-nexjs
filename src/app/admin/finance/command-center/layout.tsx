import { requireAdminPermission } from '@/lib/auth/require-admin-permission';
import { FINANCE_VIEW_STUDENT_BALANCE } from '@/lib/permissions/finance';

export default async function FinanceCommandCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPermission(FINANCE_VIEW_STUDENT_BALANCE);
  return children;
}
