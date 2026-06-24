'use client';

import { useCallback, useMemo } from 'react';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { feePlanState, refName } from '@/lib/utils/finance';
import { resolveAcademicYearName } from '@/lib/utils/academic-years';
import type { FeePlan } from '@/types/finance';
import type { FeePlanScopeCycleGroup } from './fee-plan-level-scope';
import { feePlanLevelScopeLabel, feePlanLineCount } from './fee-plan-normalizer';
import { feePlanAllowsAction } from './normalize-fee-plan';

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
  const { options: yearOptions } = useAcademicYearOptions(null);

  const academicYearLabel = useCallback(
    (row: FeePlan) =>
      resolveAcademicYearName(row, yearOptions) ??
      refName(typeof row.academic_year === 'object' ? row.academic_year : null) ??
      t('common.dash'),
    [yearOptions, t],
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

  const columns: Column<FeePlan>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.finance.planName'),
        render: (row) => (
          <button type="button" className="fee-plans-list__name-link" onClick={() => onView(row)}>
            <strong dir="auto">{row.name}</strong>
            <span className="fee-plans-list__code-chip mono">{row.code}</span>
          </button>
        ),
      },
      {
        key: 'academic_year',
        header: t('admin.finance.academicYear'),
        render: (row) => (
          <span className="fee-plans-list__meta-cell" dir="auto">
            {academicYearLabel(row)}
          </span>
        ),
      },
      {
        key: 'level',
        header: t('nav.levels'),
        render: (row) => (
          <span className="fee-plan-level-scope-summary fee-plans-list__meta-cell" dir="auto">
            {feePlanLevelScopeLabel(row, scopeGroups, scopeLabels)}
          </span>
        ),
      },
      {
        key: 'lines',
        header: t('admin.finance.feePlansWorkspace.lineCount'),
        render: (row) => (
          <span className="fee-plans-list__line-count">{feePlanLineCount(row)}</span>
        ),
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
          const canEditRow = canManage && feePlanAllowsAction(row, 'edit');
          const canConfirmRow = canManage && feePlanAllowsAction(row, 'confirm');
          const canArchiveRow = canManage && feePlanAllowsAction(row, 'archive');
          return (
            <div className="fee-plans-list__actions" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onView(row)}>
                {t('admin.finance.feePlansWorkspace.viewDetails')}
              </button>
              {canEditRow ? (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => onEdit(row)}>
                  {t('common.edit')}
                </button>
              ) : null}
              {canConfirmRow ? (
                <ConfirmActionButton
                  label={t('admin.finance.confirmPlan')}
                  confirmMessage={t('admin.finance.confirmPlanMessage')}
                  path={endpoints.admin.financeFeePlanConfirm(row.id)}
                  onSuccess={onReload}
                />
              ) : null}
              {canArchiveRow ? (
                <ConfirmActionButton
                  label={t('admin.finance.feePlansWorkspace.archive')}
                  confirmMessage={t('admin.finance.feePlansWorkspace.archiveConfirm')}
                  path={endpoints.admin.financeFeePlanArchive(row.id)}
                  variant="danger"
                  onSuccess={onReload}
                />
              ) : null}
            </div>
          );
        },
      },
    ],
    [t, canManage, scopeGroups, scopeLabels, onView, onEdit, onReload, academicYearLabel],
  );

  return (
    <div className="fee-plans-workspace__list-wrap">
      <div className="fee-plans-list__desktop fee-plans-workspace__table-wrap" data-testid="fee-plans-table">
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} onRowClick={onView} />
      </div>
      <div className="fee-plans-list__mobile" data-testid="fee-plans-cards">
        {rows.map((row) => (
          <article key={row.id} className="card fee-plan-card" onClick={() => onView(row)}>
            <div className="fee-plan-card__head">
              <div>
                <h3 className="fee-plan-card__title" dir="auto">
                  {row.name}
                </h3>
                <p className="fee-plans-list__code-chip fee-plan-card__code mono">{row.code}</p>
              </div>
              <FinanceStatusBadge state={feePlanState(row)} />
            </div>
            <dl className="fee-plan-card__stats">
              <div className="fee-plan-card__stat">
                <dt>{t('admin.finance.academicYear')}</dt>
                <dd dir="auto">{academicYearLabel(row)}</dd>
              </div>
              <div className="fee-plan-card__stat">
                <dt>{t('admin.finance.feePlansWorkspace.lineCount')}</dt>
                <dd>{feePlanLineCount(row)}</dd>
              </div>
              <div className="fee-plan-card__stat">
                <dt>{t('nav.levels')}</dt>
                <dd className="fee-plan-level-scope-summary fee-plan-level-scope-summary--multiline" dir="auto">
                  {feePlanLevelScopeLabel(row, scopeGroups, scopeLabels)}
                </dd>
              </div>
              <div className="fee-plan-card__total">
                <dt>{t('admin.finance.feePlansWorkspace.planTotal')}</dt>
                <dd>
                  <FinanceMoney amount={row.total_amount} currency={row.currency} />
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      {pagination && pagination.total > 0 ? (
        <div className="fee-plans-workspace__pagination">
          <Pagination
            page={pagination.page}
            totalPages={pagination.total_pages}
            total={pagination.total}
            onPage={onPage}
          />
        </div>
      ) : null}
    </div>
  );
}
