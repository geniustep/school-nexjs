'use client';

import { useMemo } from 'react';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { feePlanState, refName } from '@/lib/utils/finance';
import { academicYearFromSource } from '@/lib/utils/academic-years';
import type { FeePlan } from '@/types/finance';
import type { FeePlanScopeCycleGroup } from './fee-plan-level-scope';
import { feePlanLevelScopeLabel, feePlanLineCount } from './fee-plan-normalizer';

export function FeePlansList({
  rows,
  pagination,
  canManage,
  scopeGroups,
  onPage,
  onView,
  onEdit,
  onReload,
}: {
  rows: FeePlan[];
  pagination?: { page: number; total_pages: number; total: number };
  canManage: boolean;
  scopeGroups: FeePlanScopeCycleGroup[];
  onPage: (page: number) => void;
  onView: (plan: FeePlan) => void;
  onEdit: (plan: FeePlan) => void;
  onReload: () => void;
}) {
  const t = useT();

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

  const columns: Column<FeePlan>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.finance.planName'),
        render: (row) => <strong>{row.name}</strong>,
      },
      {
        key: 'code',
        header: t('admin.finance.feeTypeCode'),
        render: (row) => <span className="mono">{row.code}</span>,
      },
      {
        key: 'academic_year',
        header: t('admin.finance.academicYear'),
        render: (row) =>
          academicYearFromSource(row)?.name ??
          refName(typeof row.academic_year === 'object' ? row.academic_year : null) ??
          t('common.dash'),
      },
      {
        key: 'level',
        header: t('nav.levels'),
        render: (row) => (
          <span className="fee-plan-level-scope-summary">
            {feePlanLevelScopeLabel(row, scopeGroups, scopeLabels)}
          </span>
        ),
      },
      {
        key: 'lines',
        header: t('admin.finance.feePlansWorkspace.lineCount'),
        render: (row) => feePlanLineCount(row),
      },
      {
        key: 'total',
        header: t('admin.finance.feePlansWorkspace.planTotal'),
        render: (row) => <FinanceMoney amount={row.total_amount} currency={row.currency} />,
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (row) => <FinanceStatusBadge state={feePlanState(row)} />,
      },
      {
        key: 'actions',
        header: t('admin.actions'),
        render: (row) => {
          const state = feePlanState(row);
          return (
            <div className="fee-plans-list__actions row" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onView(row)}>
                {t('admin.finance.feePlansWorkspace.viewDetails')}
              </button>
              {canManage && state === 'draft' && (
                <>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => onEdit(row)}>
                    {t('common.edit')}
                  </button>
                  <ConfirmActionButton
                    label={t('admin.finance.confirmPlan')}
                    confirmMessage={t('admin.finance.confirmPlanMessage')}
                    path={endpoints.admin.financeFeePlanConfirm(row.id)}
                    onSuccess={onReload}
                  />
                </>
              )}
              {canManage && state !== 'archived' && (
                <ConfirmActionButton
                  label={t('admin.finance.feePlansWorkspace.archive')}
                  confirmMessage={t('admin.finance.feePlansWorkspace.archiveConfirm')}
                  path={endpoints.admin.financeFeePlanArchive(row.id)}
                  variant="danger"
                  onSuccess={onReload}
                />
              )}
            </div>
          );
        },
      },
    ],
    [t, canManage, scopeGroups, scopeLabels, onView, onEdit, onReload],
  );

  return (
    <>
      <div className="fee-plans-list__desktop" data-testid="fee-plans-table">
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} onRowClick={onView} />
      </div>
      <div className="fee-plans-list__mobile" data-testid="fee-plans-cards">
        {rows.map((row) => (
          <article key={row.id} className="card fee-plan-card" onClick={() => onView(row)}>
            <div className="fee-plan-card__head">
              <strong>{row.name}</strong>
              <FinanceStatusBadge state={feePlanState(row)} />
            </div>
            <p className="mono muted">{row.code}</p>
            <dl className="detail-list compact">
              <div>
                <dt>{t('admin.finance.academicYear')}</dt>
                <dd>
                  {academicYearFromSource(row)?.name ??
                    refName(typeof row.academic_year === 'object' ? row.academic_year : null) ??
                    t('common.dash')}
                </dd>
              </div>
              <div>
                <dt>{t('nav.levels')}</dt>
                <dd className="fee-plan-level-scope-summary fee-plan-level-scope-summary--multiline">
                  {feePlanLevelScopeLabel(row, scopeGroups, scopeLabels)}
                </dd>
              </div>
              <div>
                <dt>{t('admin.finance.feePlansWorkspace.planTotal')}</dt>
                <dd>
                  <FinanceMoney amount={row.total_amount} currency={row.currency} />
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      {pagination && pagination.total > 0 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          total={pagination.total}
          onPage={onPage}
        />
      )}
    </>
  );
}
