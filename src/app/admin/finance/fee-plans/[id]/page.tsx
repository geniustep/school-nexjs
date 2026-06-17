'use client';

import { use, useMemo } from 'react';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { FeePlanDetailView } from '@/features/admin/finance/fee-plans/fee-plan-detail-view';
import { normalizeFeePlan } from '@/features/admin/finance/fee-plans/normalize-fee-plan';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW, canManageFeePlans } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import type { FeePlan } from '@/types/finance';
import '@/features/admin/finance/finance-ui.css';
import '@/features/admin/finance/fee-plans/fee-plan-ui.css';

export default function AdminFinanceFeePlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const user = useSession();
  const state = useAdminResource<FeePlan>(endpoints.admin.financeFeePlan(id));
  const canManage = canManageFeePlans(user);
  const plan = useMemo(
    () => (state.data ? normalizeFeePlan(state.data) : null),
    [state.data],
  );

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <ResourceView state={{ ...state, data: plan }} loadingLabel={t('common.loading')}>
        {(normalizedPlan) => (
          <FeePlanDetailView
            plan={normalizedPlan}
            canManage={canManage}
            user={user}
            onReload={() => state.reload()}
          />
        )}
      </ResourceView>
    </RequireAdminPermission>
  );
}
