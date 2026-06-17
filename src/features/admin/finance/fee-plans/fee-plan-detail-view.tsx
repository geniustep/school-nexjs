'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { feeTypeFrequencyLabel } from '@/features/admin/finance/fee-types/fee-type-labels';
import { FeePlanDrawer } from '@/features/admin/finance/fee-plans/fee-plan-drawer';
import { FeePlanLineDialog } from '@/features/admin/finance/fee-plans/fee-plan-line-dialog';
import {
  buildFeePlanScopeGroups,
  normalizeFeePlanLevelIds,
} from '@/features/admin/finance/fee-plans/fee-plan-level-scope';
import { formValuesFromFeePlan, feePlanLevelScopeLabel } from '@/features/admin/finance/fee-plans/fee-plan-normalizer';
import { buildUpdateFeePlanPayload } from '@/features/admin/finance/fee-plans/fee-plan-payload';
import {
  buildFeePlanLineDisplay,
  computeFeePlanFinancialSummary,
  type FeePlanLineDisplay,
} from '@/features/admin/finance/fee-plans/fee-plan-detail-utils';
import {
  FeePlanDeleteDialog,
  FeePlanDuplicateDialog,
  FeePlanResetToDraftDialog,
  FeePlanRestoreDialog,
} from '@/features/admin/finance/fee-plans/fee-plan-lifecycle-dialogs';
import { feePlanAllowsAction } from '@/features/admin/finance/fee-plans/normalize-fee-plan';
import { FeePlanUsageSection } from '@/features/admin/finance/fee-plans/fee-plan-usage-section';
import {
  newDraftLine,
  type DraftFeePlanLine,
  type FeePlanFormValues,
} from '@/features/admin/finance/fee-plans/fee-plan-types';
import { useAcademicYearOptions, useFeeTypeOptions } from '@/features/admin/finance/use-finance-lookups';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { canAssignFees } from '@/lib/permissions/finance';
import { feePlanState, refName } from '@/lib/utils/finance';
import { resolveAcademicYearName } from '@/lib/utils/academic-years';
import type { FeePlan, FeeType } from '@/types/finance';
import type { CurrentUser } from '@/types/user';

export function FeePlanDetailView({
  plan,
  canManage,
  user,
  onReload,
}: {
  plan: FeePlan;
  canManage: boolean;
  user: CurrentUser | null;
  onReload: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const state = feePlanState(plan);
  const [editOpen, setEditOpen] = useState(false);
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [lineDraft, setLineDraft] = useState<DraftFeePlanLine | null>(null);
  const [lineSaving, setLineSaving] = useState(false);
  const [lineError, setLineError] = useState<string | null>(null);
  const [assignHintOpen, setAssignHintOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { options: yearOptions } = useAcademicYearOptions(null);
  const { feeTypes, reload: reloadFeeTypes } = useFeeTypeOptions();
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

  const lines = plan.lines ?? [];
  const financial = useMemo(() => computeFeePlanFinancialSummary(lines), [lines]);
  const lineDisplays = useMemo(
    () => lines.map((line) => buildFeePlanLineDisplay(line, plan, scopeGroups)),
    [lines, plan, scopeGroups],
  );
  const usageVisible = feePlanAllowsAction(plan, 'view_usage') || plan.usage != null;
  const planLevelIds = normalizeFeePlanLevelIds(plan);
  const yearLabel =
    resolveAcademicYearName(plan, yearOptions) ??
    refName(typeof plan.academic_year === 'object' ? plan.academic_year : null) ??
    t('common.dash');
  const levelLabel = feePlanLevelScopeLabel(plan, scopeGroups, scopeLabels);
  const currency = plan.currency ?? null;

  const canEdit = canManage && feePlanAllowsAction(plan, 'edit');
  const canConfirm =
    canManage &&
    feePlanAllowsAction(plan, 'confirm') &&
    lines.length > 0 &&
    planLevelIds.length > 0;
  const canArchive = canManage && feePlanAllowsAction(plan, 'archive');
  const canAssign = canAssignFees(user) && feePlanAllowsAction(plan, 'assign');
  const canAddFee = canEdit;

  const formValues = useMemo(
    () => (feeTypes.length ? formValuesFromFeePlan(plan, feeTypes) : null),
    [plan, feeTypes],
  );

  const openAddLine = useCallback(() => {
    setLineDraft(newDraftLine(`new-${Date.now()}`));
    setLineError(null);
    setLineDialogOpen(true);
  }, []);

  const openEditLine = useCallback(
    (display: FeePlanLineDisplay) => {
      if (!formValues) return;
      const hit = formValues.lines.find((l) => l.lineId === display.line.id);
      if (!hit) return;
      setLineDraft({ ...hit, installmentSchedule: hit.installmentSchedule.map((r) => ({ ...r })) });
      setLineError(null);
      setLineDialogOpen(true);
    },
    [formValues],
  );

  async function persistLines(nextLines: DraftFeePlanLine[]) {
    if (!formValues) return;
    setLineSaving(true);
    setLineError(null);
    const values: FeePlanFormValues = { ...formValues, lines: nextLines };
    const payload = buildUpdateFeePlanPayload(values, scopeGroups);
    const res = await api.put<FeePlan>(endpoints.admin.financeFeePlan(plan.id), payload);
    setLineSaving(false);
    if (!res.success) {
      setLineError(res.error.message);
      return;
    }
    setLineDialogOpen(false);
    onReload();
  }

  function saveLine(line: DraftFeePlanLine) {
    if (!formValues) return;
    const exists = formValues.lines.some((l) => l.clientId === line.clientId);
    const next = exists
      ? formValues.lines.map((l) => (l.clientId === line.clientId ? line : l))
      : [...formValues.lines, line];
    void persistLines(next);
  }

  function removeLine(clientId: string) {
    if (!formValues) return;
    void persistLines(formValues.lines.filter((l) => l.clientId !== clientId));
  }

  function onFeeTypeCreated(feeType: FeeType) {
    reloadFeeTypes();
    setLineDraft((prev) =>
      prev
        ? { ...prev, feeTypeId: feeType.id, label: prev.label.trim() ? prev.label : feeType.name }
        : prev,
    );
  }

  return (
    <div className="fee-plan-detail-page">
      <nav className="fee-plan-detail-breadcrumb" aria-label={t('admin.finance.feePlansWorkspace.detailBreadcrumb')}>
        <Link href="/admin/finance">{t('admin.finance.title')}</Link>
        <span className="fee-plan-detail-breadcrumb__sep" aria-hidden="true">
          /
        </span>
        <Link href="/admin/finance/fee-plans">{t('admin.finance.feePlansWorkspace.breadcrumbPlans')}</Link>
        <span className="fee-plan-detail-breadcrumb__sep" aria-hidden="true">
          /
        </span>
        <span className="fee-plan-detail-breadcrumb__current">
          {t('admin.finance.feePlansWorkspace.detailTitle')}
        </span>
      </nav>

      <Link href="/admin/finance/fee-plans" className="back-link fee-plan-detail-page__back">
        ‹ {t('admin.finance.backToFeePlans')}
      </Link>

      <div className="fee-plan-detail-layout">
        <div className="fee-plan-detail-layout__main">
          <header className="fee-plan-detail-header">
            <div className="fee-plan-detail-header__title-block">
              <h1 className="fee-plan-detail-header__title">{plan.name}</h1>
              <div className="fee-plan-detail-header__badges">
                <FinanceStatusBadge state={state} />
                <span className="badge badge--slate">{yearLabel}</span>
                <span className="badge badge--slate fee-plan-detail-header__levels">{levelLabel}</span>
                {currency ? <span className="badge badge--slate mono">{currency}</span> : null}
              </div>
              {plan.code ? <p className="fee-plan-detail-header__code muted mono">{plan.code}</p> : null}
            </div>
          </header>

          {canManage && state === 'draft' && lines.length === 0 ? (
            <p className="fee-plan-detail-page__hint">{t('admin.finance.confirmPlanNeedsLines')}</p>
          ) : null}

          <section className="fee-plan-detail-stats card">
            <div className="fee-plan-detail-stats__grid">
              <div>
                <span className="fee-plan-detail-stats__label">{t('academic.status')}</span>
                <FinanceStatusBadge state={state} />
              </div>
              <div>
                <span className="fee-plan-detail-stats__label">{t('admin.finance.academicYear')}</span>
                <strong>{yearLabel}</strong>
              </div>
              <div>
                <span className="fee-plan-detail-stats__label">{t('nav.levels')}</span>
                <span className="fee-plan-detail-stats__levels">{levelLabel}</span>
              </div>
              <div>
                <span className="fee-plan-detail-stats__label">
                  {t('admin.finance.feePlansWorkspace.detailFeeCount')}
                </span>
                <strong>{financial.lineCount}</strong>
              </div>
            </div>
          </section>

          {usageVisible ? <FeePlanUsageSection plan={plan} /> : null}

          <section className="card fee-plan-detail-lines">
            <div className="fee-plan-detail-lines__head">
              <h2>{t('admin.finance.feePlansWorkspace.detailFeesSection')}</h2>
              {canAddFee ? (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={openAddLine}
                  disabled={lineSaving || !formValues}
                >
                  {t('admin.finance.feePlansWorkspace.addFee')}
                </button>
              ) : null}
            </div>

            {lineDisplays.length === 0 ? (
              <p className="muted">{t('admin.finance.feePlansWorkspace.noLinesYet')}</p>
            ) : (
              <>
                <div className="fee-plan-detail-lines__table fee-plan-detail-lines__table--desktop">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('admin.finance.feeTypeName')}</th>
                        <th>{t('admin.finance.feePlansWorkspace.detailScopeColumn')}</th>
                        <th>{t('admin.finance.lineAmount')}</th>
                        <th>{t('admin.finance.feeTypesWorkspace.frequency')}</th>
                        <th>{t('admin.finance.feePlansWorkspace.detailMandatoryColumn')}</th>
                        <th>{t('admin.finance.feePlansWorkspace.detailInstallmentsColumn')}</th>
                        <th>{t('admin.finance.feePlansWorkspace.detailDueColumn')}</th>
                        <th>{t('admin.finance.feePlansWorkspace.detailExpectedTotalColumn')}</th>
                        {canEdit ? <th>{t('admin.actions')}</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {lineDisplays.map((display) => (
                        <FeePlanLineTableRow
                          key={display.line.id}
                          display={display}
                          currency={currency}
                          canEdit={canEdit}
                          formatDate={formatDate}
                          t={t}
                          onEdit={() => openEditLine(display)}
                          onRemove={() => {
                            const clientId = formValues?.lines.find((l) => l.lineId === display.line.id)?.clientId;
                            if (clientId) removeLine(clientId);
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="fee-plan-detail-lines__cards fee-plan-detail-lines__cards--mobile">
                  {lineDisplays.map((display) => (
                    <FeePlanLineCard
                      key={display.line.id}
                      display={display}
                      currency={currency}
                      canEdit={canEdit}
                      formatDate={formatDate}
                      t={t}
                      onEdit={() => openEditLine(display)}
                      onRemove={() => {
                        const clientId = formValues?.lines.find((l) => l.lineId === display.line.id)?.clientId;
                        if (clientId) removeLine(clientId);
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </section>

          {plan.notes ? (
            <section className="card fee-plan-detail-notes">
              <h2>{t('common.note')}</h2>
              <p>{plan.notes}</p>
            </section>
          ) : null}
        </div>

        <aside className="fee-plan-detail-layout__aside">
          <section className="card fee-plan-detail-actions">
            <h2>{t('admin.finance.feePlansWorkspace.detailActionsTitle')}</h2>
            <div className="fee-plan-detail-actions__buttons">
              {canEdit ? (
                <button type="button" className="btn btn--primary" onClick={() => setEditOpen(true)}>
                  {t('admin.finance.feePlansWorkspace.editPlan')}
                </button>
              ) : null}
              {canConfirm ? (
                <ConfirmActionButton
                  label={t('admin.finance.confirmPlan')}
                  confirmMessage={t('admin.finance.confirmPlanMessage')}
                  path={endpoints.admin.financeFeePlanConfirm(plan.id)}
                  variant="primary"
                  onSuccess={onReload}
                />
              ) : null}
              {canAssign ? (
                <button type="button" className="btn btn--primary" onClick={() => setAssignHintOpen(true)}>
                  {t('admin.finance.feePlansWorkspace.applyToStudents')}
                </button>
              ) : null}
              {feePlanAllowsAction(plan, 'duplicate') ? (
                <button type="button" className="btn btn--ghost" onClick={() => setDuplicateOpen(true)}>
                  {t('admin.finance.feePlansWorkspace.copyPlan')}
                </button>
              ) : null}
              {feePlanAllowsAction(plan, 'reset_to_draft') ? (
                <button type="button" className="btn btn--ghost" onClick={() => setResetOpen(true)}>
                  {t('admin.finance.feePlansWorkspace.resetToDraft')}
                </button>
              ) : null}
              {feePlanAllowsAction(plan, 'restore') ? (
                <button type="button" className="btn btn--ghost" onClick={() => setRestoreOpen(true)}>
                  {t('admin.finance.feePlansWorkspace.restorePlan')}
                </button>
              ) : null}
              {canArchive ? (
                <ConfirmActionButton
                  label={t('admin.finance.feePlansWorkspace.archive')}
                  confirmMessage={t('admin.finance.feePlansWorkspace.archiveConfirm')}
                  path={endpoints.admin.financeFeePlanArchive(plan.id)}
                  variant="danger"
                  onSuccess={onReload}
                />
              ) : null}
              {feePlanAllowsAction(plan, 'delete') ? (
                <button
                  type="button"
                  className="btn btn--ghost fee-plan-detail-actions__danger"
                  onClick={() => setDeleteOpen(true)}
                >
                  {t('admin.finance.feePlansWorkspace.deletePlan')}
                </button>
              ) : null}
            </div>
            {!canEdit && feePlanAllowsAction(plan, 'reset_to_draft') === false ? (
              <p className="muted fee-plan-detail-actions__hint">
                {t('admin.finance.feePlansWorkspace.confirmedReadOnly')}
              </p>
            ) : null}
          </section>

          <section className="card fee-plan-detail-financial">
            <h2>{t('admin.finance.feePlansWorkspace.detailFinancialTitle')}</h2>
            <dl className="fee-plan-detail-financial__list">
              {(financial.oneTimeRequiredTotal > 0 || financial.oneTimeOptionalTotal > 0) && (
                <div>
                  <dt>{t('admin.finance.feePlansWorkspace.detailOneTimeFees')}</dt>
                  <dd>
                    <FinanceMoney
                      amount={financial.oneTimeRequiredTotal + financial.oneTimeOptionalTotal}
                      currency={currency}
                    />
                  </dd>
                </div>
              )}
              {(financial.monthlyRequiredTotal > 0 || financial.monthlyOptionalTotal > 0) && (
                <div>
                  <dt>{t('admin.finance.feePlansWorkspace.detailMonthlyValue')}</dt>
                  <dd>
                    <FinanceMoney
                      amount={financial.monthlyRequiredTotal + financial.monthlyOptionalTotal}
                      currency={currency}
                    />
                    <span className="muted fee-plan-detail-financial__suffix">
                      {t('admin.finance.feePlansWorkspace.detailPerMonth')}
                    </span>
                  </dd>
                </div>
              )}
              {financial.annualEstimate != null && financial.annualFormulaKey ? (
                <div className="fee-plan-detail-financial__annual">
                  <dt>{t('admin.finance.feePlansWorkspace.detailAnnualEstimate')}</dt>
                  <dd>
                    <FinanceMoney amount={financial.annualEstimate} currency={currency} />
                    <span className="muted fee-plan-detail-financial__formula">
                      {t(financial.annualFormulaKey, financial.annualFormulaValues ?? undefined)}
                    </span>
                  </dd>
                </div>
              ) : financial.monthlyRequiredTotal + financial.monthlyOptionalTotal > 0 ? (
                <div>
                  <dt>{t('admin.finance.feePlansWorkspace.detailAnnualEstimate')}</dt>
                  <dd className="muted">{t('admin.finance.feePlansWorkspace.detailAnnualNotComputed')}</dd>
                </div>
              ) : null}
              {financial.maxInstallmentCount > 0 ? (
                <div>
                  <dt>{t('admin.finance.feePlansWorkspace.detailMaxInstallments')}</dt>
                  <dd>{financial.maxInstallmentCount}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </aside>
      </div>

      {canManage ? (
        <FeePlanDrawer
          open={editOpen}
          mode="edit"
          planId={plan.id}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            onReload();
          }}
        />
      ) : null}

      {formValues && lineDraft ? (
        <FeePlanLineDialog
          open={lineDialogOpen}
          line={lineDraft}
          feeTypes={feeTypes}
          planLevelIds={planLevelIds}
          scopeGroups={scopeGroups}
          onSave={saveLine}
          onClose={() => setLineDialogOpen(false)}
          onFeeTypeCreated={onFeeTypeCreated}
        />
      ) : null}

      {assignHintOpen ? (
        <div className="fee-plan-detail-dialog-backdrop" role="presentation" onClick={() => setAssignHintOpen(false)}>
          <div
            className="card fee-plan-detail-dialog"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{t('admin.finance.feePlansWorkspace.applyToStudents')}</h3>
            <p>{t('admin.finance.feePlansWorkspace.applyToStudentsHint')}</p>
            <div className="fee-plan-detail-dialog__actions">
              <Link href="/admin/finance/students" className="btn btn--primary">
                {t('admin.finance.feePlansWorkspace.goToStudentFinance')}
              </Link>
              <button type="button" className="btn btn--ghost" onClick={() => setAssignHintOpen(false)}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lineError ? <p className="form-error fee-plan-detail-page__error">{lineError}</p> : null}

      <FeePlanResetToDraftDialog
        open={resetOpen}
        plan={plan}
        onClose={() => setResetOpen(false)}
        onSuccess={onReload}
      />
      <FeePlanRestoreDialog
        open={restoreOpen}
        plan={plan}
        onClose={() => setRestoreOpen(false)}
        onSuccess={onReload}
      />
      <FeePlanDuplicateDialog
        open={duplicateOpen}
        plan={plan}
        onClose={() => setDuplicateOpen(false)}
        onDuplicated={() => onReload()}
      />
      <FeePlanDeleteDialog
        open={deleteOpen}
        plan={plan}
        onClose={() => setDeleteOpen(false)}
        onDeleted={onReload}
      />
    </div>
  );
}

function FeePlanLineTableRow({
  display,
  currency,
  canEdit,
  formatDate,
  t,
  onEdit,
  onRemove,
}: {
  display: FeePlanLineDisplay;
  currency: string | null;
  canEdit: boolean;
  formatDate: (value: string) => string;
  t: (key: string, values?: Record<string, string | number>) => string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <tr>
      <td>
        <strong>{display.feeName || t('common.dash')}</strong>
        {display.warnings.map((w) => (
          <p key={w} className="fee-plan-detail-line-warning" role="status">
            {t(`admin.finance.feePlansWorkspace.detailWarnings.${w}`)}
          </p>
        ))}
      </td>
      <td>
        {display.scopeLabelKey === 'allPlanLevels'
          ? t('admin.finance.feePlansWorkspace.allPlanLevels')
          : display.scopeNames.join(', ') || t('common.dash')}
      </td>
      <td className="mono">
        <FinanceMoney amount={display.line.amount} currency={currency} />
      </td>
      <td>{feeTypeFrequencyLabel(display.frequencyUi, t)}</td>
      <td>
        <span className={`badge ${display.isOptional ? 'badge--slate' : 'badge--blue'}`}>
          {display.isOptional
            ? t('admin.finance.feePlansWorkspace.optionalBadge')
            : t('admin.finance.feePlansWorkspace.requiredBadge')}
        </span>
      </td>
      <td>{display.installmentCount}</td>
      <td>
        {display.dueLabelKey === 'fixedDate' && display.dueDate
          ? formatDate(display.dueDate)
          : t(`admin.finance.feePlansWorkspace.detailDue.${display.dueLabelKey}`)}
      </td>
      <td>
        {display.lineExpectedTotal != null ? (
          <FinanceMoney amount={display.lineExpectedTotal} currency={currency} />
        ) : (
          <span className="muted">{t('admin.finance.feePlansWorkspace.detailLineTotalNA')}</span>
        )}
      </td>
      {canEdit ? (
        <td>
          <div className="fee-plan-detail-lines__row-actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit}>
              {t('common.edit')}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onRemove}>
              {t('admin.finance.feePlansWorkspace.removeLine')}
            </button>
          </div>
        </td>
      ) : null}
    </tr>
  );
}

function FeePlanLineCard({
  display,
  currency,
  canEdit,
  formatDate,
  t,
  onEdit,
  onRemove,
}: {
  display: FeePlanLineDisplay;
  currency: string | null;
  canEdit: boolean;
  formatDate: (value: string) => string;
  t: (key: string, values?: Record<string, string | number>) => string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="fee-plan-detail-line-card">
      <div className="fee-plan-detail-line-card__head">
        <strong>{display.feeName}</strong>
        <FinanceMoney amount={display.line.amount} currency={currency} />
      </div>
      <dl>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.detailScopeColumn')}</dt>
          <dd>
            {display.scopeLabelKey === 'allPlanLevels'
              ? t('admin.finance.feePlansWorkspace.allPlanLevels')
              : display.scopeNames.join(', ')}
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.feeTypesWorkspace.frequency')}</dt>
          <dd>{feeTypeFrequencyLabel(display.frequencyUi, t)}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.detailMandatoryColumn')}</dt>
          <dd>
            {display.isOptional
              ? t('admin.finance.feePlansWorkspace.optionalBadge')
              : t('admin.finance.feePlansWorkspace.requiredBadge')}
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.detailInstallmentsColumn')}</dt>
          <dd>{display.installmentCount}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.detailDueColumn')}</dt>
          <dd>
            {display.dueLabelKey === 'fixedDate' && display.dueDate
              ? formatDate(display.dueDate)
              : t(`admin.finance.feePlansWorkspace.detailDue.${display.dueLabelKey}`)}
          </dd>
        </div>
      </dl>
      {display.warnings.map((w) => (
        <p key={w} className="fee-plan-detail-line-warning" role="status">
          {t(`admin.finance.feePlansWorkspace.detailWarnings.${w}`)}
        </p>
      ))}
      {canEdit ? (
        <div className="fee-plan-detail-line-card__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit}>
            {t('common.edit')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRemove}>
            {t('admin.finance.feePlansWorkspace.removeLine')}
          </button>
        </div>
      ) : null}
    </article>
  );
}
