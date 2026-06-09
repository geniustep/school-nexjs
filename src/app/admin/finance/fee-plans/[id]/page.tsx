'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { DataTable, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW, canManageFeePlans } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import { feePlanState, refName } from '@/lib/utils/finance';
import { academicYearFromSource } from '@/lib/utils/academic-years';
import type { FeePlan, FeePlanLine } from '@/types/finance';

export default function AdminFinanceFeePlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const user = useSession();
  const { formatDate } = useFormat();
  const state = useAdminResource<FeePlan>(endpoints.admin.financeFeePlan(id));
  const canManage = canManageFeePlans(user);

  const lineColumns: Column<FeePlanLine>[] = [
    { key: 'fee_type', header: t('admin.finance.feeTypeName'), render: (l) => l.fee_type_name ?? t('common.dash') },
    {
      key: 'amount',
      header: t('admin.finance.lineAmount'),
      render: (l) => <FinanceMoney amount={l.amount} />,
    },
    {
      key: 'installments',
      header: t('admin.finance.installments'),
      render: (l) => l.installment_count ?? t('common.dash'),
    },
    {
      key: 'due',
      header: t('admin.finance.dueDate'),
      render: (l) => (l.due_date ? formatDate(l.due_date) : t('common.dash')),
    },
  ];

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance/fee-plans" className="back-link">
        ‹ {t('admin.finance.backToFeePlans')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(plan) => (
          <>
            <PageHeader
              title={plan.name}
              subtitle={plan.code}
              actions={
                canManage && feePlanState(plan) === 'draft' && (plan.lines?.length ?? 0) > 0 ? (
                  <ConfirmActionButton
                    label={t('admin.finance.confirmPlan')}
                    confirmMessage={t('admin.finance.confirmPlanMessage')}
                    path={endpoints.admin.financeFeePlanConfirm(id)}
                    onSuccess={() => state.reload()}
                  />
                ) : undefined
              }
            />
            {canManage && feePlanState(plan) === 'draft' && (plan.lines?.length ?? 0) === 0 && (
              <p className="muted">{t('admin.finance.confirmPlanNeedsLines')}</p>
            )}
            <div className="detail-grid">
              <div className="card">
                <dl className="detail-list">
                  <div>
                    <dt>{t('academic.status')}</dt>
                    <dd>
                      <FinanceStatusBadge state={feePlanState(plan)} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.academicYear')}</dt>
                    <dd>
                      {academicYearFromSource(plan)?.name ??
                        refName(typeof plan.academic_year === 'object' ? plan.academic_year : null) ??
                        t('common.dash')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.totalAmount')}</dt>
                    <dd>
                      <FinanceMoney amount={plan.total_amount} currency={plan.currency} />
                    </dd>
                  </div>
                  {plan.level?.name && (
                    <div>
                      <dt>{t('nav.levels')}</dt>
                      <dd>{plan.level.name}</dd>
                    </div>
                  )}
                  {plan.class?.name && (
                    <div>
                      <dt>{t('nav.classes')}</dt>
                      <dd>{plan.class.name}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
            {(plan.lines?.length ?? 0) > 0 && (
              <section className="card">
                <h3>{t('admin.finance.planLines')}</h3>
                <DataTable columns={lineColumns} rows={plan.lines ?? []} rowKey={(row) => row.id} />
              </section>
            )}
            {plan.notes && (
              <section className="card">
                <h3>{t('common.note')}</h3>
                <p>{plan.notes}</p>
              </section>
            )}
          </>
        )}
      </ResourceView>
    </RequireAdminPermission>
  );
}
