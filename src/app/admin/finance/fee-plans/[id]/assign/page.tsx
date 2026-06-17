'use client';

import { use, useMemo } from 'react';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { FeePlanAssignFlow } from '@/features/admin/finance/fee-plan-assign-flow';
import { normalizeFeePlan } from '@/features/admin/finance/fee-plans/normalize-fee-plan';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW, canAssignFees } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import type { FeePlan } from '@/types/finance';
import '@/features/admin/finance/finance-ui.css';
import '@/features/admin/finance/fee-plans/fee-plan-ui.css';

export default function AdminFinanceFeePlanAssignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const user = useSession();
  const state = useAdminResource<FeePlan>(endpoints.admin.financeFeePlan(id));
  const plan = useMemo(
    () => (state.data ? normalizeFeePlan(state.data) : null),
    [state.data],
  );

  if (!canAssignFees(user)) {
    return (
      <RequireAdminPermission permission={FINANCE_VIEW}>
        <p className="form-error">{t('admin.finance.assignFlow.forbidden')}</p>
      </RequireAdminPermission>
    );
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <ResourceView state={{ ...state, data: plan }} loadingLabel={t('common.loading')}>
        {(normalizedPlan) => <FeePlanAssignFlow plan={normalizedPlan} />}
      </ResourceView>
    </RequireAdminPermission>
  );
}
