'use client';

import { use } from 'react';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { FeePlanDetailView } from '@/features/admin/finance/fee-plans/fee-plan-detail-view';
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

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(plan) => (
          <FeePlanDetailView
            plan={plan}
            canManage={canManage}
            user={user}
            onReload={() => state.reload()}
          />
        )}
      </ResourceView>
    </RequireAdminPermission>
  );
}
