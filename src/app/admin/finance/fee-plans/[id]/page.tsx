'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { DataTable, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { FeePlanDrawer } from '@/features/admin/finance/fee-plans/fee-plan-drawer';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW, canManageFeePlans } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import { feePlanState, refName } from '@/lib/utils/finance';
import { resolveAcademicYearName } from '@/lib/utils/academic-years';
import type { FeePlan, FeePlanLine } from '@/types/finance';
import { buildFeePlanScopeGroups } from '@/features/admin/finance/fee-plans/fee-plan-level-scope';
import { feePlanLevelScopeLabel } from '@/features/admin/finance/fee-plans/fee-plan-normalizer';
import { normalizeFeePlanLevelIds } from '@/features/admin/finance/fee-plans/fee-plan-level-scope';
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
  const { formatDate } = useFormat();
  const state = useAdminResource<FeePlan>(endpoints.admin.financeFeePlan(id));
  const canManage = canManageFeePlans(user);
  const [editOpen, setEditOpen] = useState(false);
  const { options: yearOptions } = useAcademicYearOptions(null);
  const levelOptionsState = useLevelOptions(true, { include_enabled: 'true' });
  const scopeGroups = useMemo(
    () => buildFeePlanScopeGroups(levelOptionsState.options),
    [levelOptionsState.options],
  );

  const scopeLabels = useMemo(
    () => ({
      selectLevels: t('admin.finance.feePlansWorkspace.selectLevels'),
      allInCycle: (cycleName: string) =>
        t('admin.finance.feePlansWorkspace.levelScopeAllInCycle', { cycle: cycleName }),
      compact: (cycles: number, count: number) =>
        t('admin.finance.feePlansWorkspace.levelScopeCompact', { cycles, count }),
      noScope: t('admin.finance.feePlansWorkspace.noScopeDefined'),
    }),
    [t],
  );

  const lineColumns: Column<FeePlanLine>[] = [
    { key: 'fee_type', header: t('admin.finance.feeTypeName'), render: (l) => l.fee_type_name ?? t('common.dash') },
    {
      key: 'amount',
      header: t('admin.finance.lineAmount'),
      render: (l) => <FinanceMoney amount={l.amount} />,
    },
    {
      key: 'frequency',
      header: t('admin.finance.feeTypesWorkspace.frequency'),
      render: (l) => l.frequency ?? t('common.dash'),
    },
    {
      key: 'optional',
      header: t('academic.status'),
      render: (l) =>
        l.is_optional
          ? t('admin.finance.feePlansWorkspace.optionalBadge')
          : t('admin.finance.feePlansWorkspace.requiredBadge'),
    },
    {
      key: 'installments',
      header: t('admin.finance.installmentsHeading'),
      render: (l) => l.installment_count ?? t('common.dash'),
    },
    {
      key: 'due',
      header: t('admin.finance.dueDate'),
      render: (l) =>
        l.due_date ? (
          formatDate(l.due_date)
        ) : (
          <span className="fee-plan-detail-lines__empty">{t('common.dash')}</span>
        ),
    },
  ];

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <div className="fee-plan-detail-page">
        <Link href="/admin/finance/fee-plans" className="back-link fee-plan-detail-page__back">
          ‹ {t('admin.finance.backToFeePlans')}
        </Link>
        <ResourceView state={state} loadingLabel={t('common.loading')}>
          {(plan) => {
            const canEdit = canManage && feePlanState(plan) === 'draft';
            const canConfirm =
              canEdit &&
              (plan.lines?.length ?? 0) > 0 &&
              normalizeFeePlanLevelIds(plan).length > 0;
            const showActions = canEdit || canConfirm;

            return (
              <>
                <PageHeader
                  title={plan.name}
                  subtitle={plan.code}
                  actions={
                    showActions ? (
                      <div className="fee-plan-detail-page__actions">
                        {canEdit ? (
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => setEditOpen(true)}
                          >
                            {t('common.edit')}
                          </button>
                        ) : null}
                        {canConfirm ? (
                          <ConfirmActionButton
                            label={t('admin.finance.confirmPlan')}
                            confirmMessage={t('admin.finance.confirmPlanMessage')}
                            path={endpoints.admin.financeFeePlanConfirm(id)}
                            variant="primary"
                            onSuccess={() => state.reload()}
                          />
                        ) : null}
                      </div>
                    ) : undefined
                  }
                />

                {canManage && feePlanState(plan) === 'draft' && (plan.lines?.length ?? 0) === 0 ? (
                  <p className="fee-plan-detail-page__hint">{t('admin.finance.confirmPlanNeedsLines')}</p>
                ) : null}

                <section className="card fee-plan-detail-summary">
                  <dl className="fee-plan-detail-summary__grid">
                    <div>
                      <dt>{t('academic.status')}</dt>
                      <dd>
                        <FinanceStatusBadge state={feePlanState(plan)} />
                      </dd>
                    </div>
                    <div>
                      <dt>{t('admin.finance.academicYear')}</dt>
                      <dd>
                        {resolveAcademicYearName(plan, yearOptions) ??
                          refName(typeof plan.academic_year === 'object' ? plan.academic_year : null) ??
                          t('common.dash')}
                      </dd>
                    </div>
                    <div className="fee-plan-detail-summary__total">
                      <dt>{t('admin.finance.totalAmount')}</dt>
                      <dd>
                        <FinanceMoney amount={plan.total_amount} currency={plan.currency} />
                      </dd>
                    </div>
                    <div className="fee-plan-detail-summary__levels">
                      <dt>{t('nav.levels')}</dt>
                      <dd className="fee-plan-level-scope-summary fee-plan-level-scope-summary--multiline">
                        {feePlanLevelScopeLabel(plan, scopeGroups, scopeLabels)}
                      </dd>
                    </div>
                    {plan.class?.name ? (
                      <div className="fee-plan-detail-summary__class">
                        <dt>{t('nav.classes')}</dt>
                        <dd>{plan.class.name}</dd>
                      </div>
                    ) : null}
                  </dl>
                </section>

                {(plan.lines?.length ?? 0) > 0 ? (
                  <section className="card fee-plan-detail-lines">
                    <div className="fee-plan-detail-lines__head">
                      <h2>{t('admin.finance.planLines')}</h2>
                      <span className="fee-plan-detail-lines__count">{plan.lines?.length ?? 0}</span>
                    </div>
                    <div className="fee-plan-detail-lines__table">
                      <DataTable columns={lineColumns} rows={plan.lines ?? []} rowKey={(row) => row.id} />
                    </div>
                  </section>
                ) : null}

                {plan.notes ? (
                  <section className="card fee-plan-detail-notes">
                    <h2>{t('common.note')}</h2>
                    <p>{plan.notes}</p>
                  </section>
                ) : null}

                {canManage ? (
                  <FeePlanDrawer
                    open={editOpen}
                    mode="edit"
                    planId={plan.id}
                    onClose={() => setEditOpen(false)}
                    onSaved={() => {
                      setEditOpen(false);
                      state.reload();
                    }}
                  />
                ) : null}
              </>
            );
          }}
        </ResourceView>
      </div>
    </RequireAdminPermission>
  );
}
