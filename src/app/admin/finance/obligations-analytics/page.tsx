'use client';

import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { FINANCE_VIEW } from '@/lib/permissions/finance';
import { ContractualAnalyticsView } from '@/features/admin/finance/contractual-analytics/contractual-analytics-view';

export default function ObligationsAnalyticsPage() {
  return <RequireAdminPermission permission={FINANCE_VIEW}>
    <main><ContractualAnalyticsView mode="page" /></main>
  </RequireAdminPermission>;
}
