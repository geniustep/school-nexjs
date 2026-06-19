'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { pricingModeDisplayKey } from '@/features/admin/finance/fee-plans/fee-plan-pricing';
import { resolveFeePlanEditAction } from '@/features/admin/finance/fee-plans/fee-plan-edit-action';
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
import { useAcademicYearOptions, useFinanceReferenceData, useFeeTypeOptions } from '@/features/admin/finance/use-finance-lookups';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { canAssignFees } from '@/lib/permissions/finance';
import { feePlanState, refName } from '@/lib/utils/finance';
import { mergeAcademicYearOptions } from '@/lib/utils/academic-years';
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
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetAndEditOpen, setResetAndEditOpen] = useState(false);
  const [openEditAfterReload, setOpenEditAfterReload] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { options: hookYearOptions } = useAcademicYearOptions(null);
  const { academicYears: financeRefYears } = useFinanceReferenceData();
  const yearLookupOptions = useMemo(
    () =>
      mergeAcademicYearOptions(
        ...hookYearOptions,
        ...financeRefYears.map((year) => ({ id: year.id, name: year.name })),
      ),
    [hookYearOptions, financeRefYears],
  );
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
  const yearLabel = useMemo(() => {
    const fromLookup = plan.academic_year_id
      ? yearLookupOptions.find((year) => year.id === plan.academic_year_id)?.name?.trim()
      : null;
    if (fromLookup) return fromLookup;

    const fromRef =
      typeof plan.academic_year === 'object' && plan.academic_year !== null
        ? refName(plan.academic_year)
        : typeof plan.academic_year === 'string'
          ? plan.academic_year.trim()
          : null;
    if (fromRef) return fromRef;

    if (plan.academic_year_name?.trim()) return plan.academic_year_name.trim();

    return t('common.dash');
  }, [plan, yearLookupOptions, t]);
  const levelLabel = feePlanLevelScopeLabel(plan, scopeGroups, scopeLabels);
  const currency = plan.currency ?? null;

  const canEdit = canManage && feePlanAllowsAction(plan, 'edit');
  const editAction = useMemo(() => resolveFeePlanEditAction(plan, canManage), [plan, canManage]);
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

  useEffect(() => {
    if (!openEditAfterReload || !canEdit) return;
    setEditOpen(true);
    setOpenEditAfterReload(false);
  }, [openEditAfterReload, canEdit, plan.id, state]);

  const handleEditPlan = useCallback(() => {
    if (editAction.type === 'direct_edit') {
      setEditOpen(true);
      return;
    }
    if (editAction.type === 'reset_then_edit') {
      setResetAndEditOpen(true);
      return;
    }
    if (editAction.type === 'duplicate_for_edit') {
      setDuplicateOpen(true);
    }
  }, [editAction.type]);

  function handleResetSuccess(openEdit: boolean) {
    onReload();
    if (openEdit) {
      setOpenEditAfterReload(true);
    }
  }

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
                        <th>{t('admin.finance.feePlansWorkspace.pricing.modeLabel')}</th>
                        <th>{t('admin.finance.feePlansWorkspace.pricing.unitOrTotalColumn')}</th>
                        <th>{t('admin.finance.feeTypesWorkspace.frequency')}</th>
                        <th>{t('admin.finance.feePlansWorkspace.detailInstallmentsColumn')}</th>
                        <th>{t('admin.finance.feePlansWorkspace.pricing.installmentAmount')}</th>
                        <th>{t('admin.finance.feePlansWorkspace.detailExpectedTotalColumn')}</th>
                        <th>{t('admin.finance.feePlansWorkspace.detailMandatoryColumn')}</th>
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
              {editAction.type === 'direct_edit' || editAction.type === 'reset_then_edit' ? (
                <button type="button" className="btn btn--primary" onClick={handleEditPlan}>
                  {t('admin.finance.feePlansWorkspace.editPlan')}
                </button>
              ) : null}
              {editAction.type === 'duplicate_for_edit' ? (
                <button type="button" className="btn btn--primary" onClick={handleEditPlan}>
                  {t('admin.finance.feePlansWorkspace.duplicateForEdit')}
                </button>
              ) : null}
              {canAssign ? (
                <Link
                  href={`/admin/finance/fee-plans/${plan.id}/assign`}
                  className="btn btn--primary"
                >
                  {t('admin.finance.feePlansWorkspace.applyToStudents')}
                </Link>
              ) : null}
              {editAction.canDuplicate && editAction.type !== 'duplicate_for_edit' ? (
                <button type="button" className="btn btn--ghost" onClick={() => setDuplicateOpen(true)}>
                  {t('admin.finance.feePlansWorkspace.copyPlan')}
                </button>
              ) : null}
              {editAction.canResetToDraft ? (
                <button type="button" className="btn btn--ghost" onClick={() => setResetOpen(true)}>
                  {t('admin.finance.feePlansWorkspace.resetToDraft')}
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
            {editAction.type === 'duplicate_for_edit' ? (
              <p className="muted fee-plan-detail-actions__hint">
                {t('admin.finance.feePlansWorkspace.duplicateForEditHint')}
              </p>
            ) : null}
            {editAction.type === 'none' && state !== 'draft' && !editAction.isUsed ? (
              <p className="muted fee-plan-detail-actions__hint">
                {t('admin.finance.feePlansWorkspace.confirmedReadOnly')}
              </p>
            ) : null}
          </section>

          <section className="card fee-plan-detail-financial">
            <h2>{t('admin.finance.feePlansWorkspace.detailFinancialTitle')}</h2>
            <dl className="fee-plan-detail-financial__list">
              {financial.oneTimeRequiredTotal > 0 ? (
                <div>
                  <dt>{t('admin.finance.feePlansWorkspace.detailOneTimeFees')}</dt>
                  <dd>
                    <FinanceMoney amount={financial.oneTimeRequiredTotal} currency={currency} />
                  </dd>
                </div>
              ) : null}
              {financial.installmentLumpRequiredTotal > 0 ? (
                <div>
                  <dt>{t('admin.finance.feePlansWorkspace.detailInstallmentLumpFees')}</dt>
                  <dd>
                    <FinanceMoney amount={financial.installmentLumpRequiredTotal} currency={currency} />
                    {financial.installmentLumpRequiredLines.map((item, index) => (
                      <span key={index} className="muted fee-plan-detail-financial__suffix block">
                        {t('admin.finance.feePlansWorkspace.detailInstallmentLumpFormula', {
                          installment: item.installmentAmount,
                          count: item.installmentCount,
                        })}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
              {financial.recurringRequiredTotal > 0 ? (
                <div>
                  <dt>{t('admin.finance.feePlansWorkspace.detailRecurringFees')}</dt>
                  <dd>
                    <FinanceMoney amount={financial.recurringRequiredTotal} currency={currency} />
                    {financial.monthlyRequiredTotal > 0 && financial.recurringPeriodCount ? (
                      <span className="muted fee-plan-detail-financial__suffix block">
                        {t('admin.finance.feePlansWorkspace.detailRecurringFormula', {
                          monthly: financial.monthlyRequiredTotal,
                          count: financial.recurringPeriodCount,
                        })}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ) : null}
              {financial.expectedMonthlyInstallment != null && financial.expectedMonthlyInstallment > 0 ? (
                <div>
                  <dt>{t('admin.finance.feePlansWorkspace.detailExpectedMonthlyInstallment')}</dt>
                  <dd>
                    <FinanceMoney amount={financial.expectedMonthlyInstallment} currency={currency} />
                  </dd>
                </div>
              ) : null}
              {financial.annualEstimate != null ? (
                <div className="fee-plan-detail-financial__annual">
                  <dt>{t('admin.finance.feePlansWorkspace.detailAnnualEstimate')}</dt>
                  <dd>
                    <FinanceMoney amount={financial.annualEstimate} currency={currency} />
                    {financial.annualFormulaKey && financial.annualFormulaValues ? (
                      <span className="muted fee-plan-detail-financial__formula">
                        {t(financial.annualFormulaKey, financial.annualFormulaValues)}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ) : financial.recurringRequiredTotal > 0 || financial.installmentLumpRequiredTotal > 0 ? (
                <div>
                  <dt>{t('admin.finance.feePlansWorkspace.detailAnnualEstimate')}</dt>
                  <dd className="muted">{t('admin.finance.feePlansWorkspace.detailAnnualNotComputed')}</dd>
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

      {lineError ? <p className="form-error fee-plan-detail-page__error">{lineError}</p> : null}

      <FeePlanResetToDraftDialog
        open={resetOpen}
        plan={plan}
        onClose={() => setResetOpen(false)}
        onSuccess={() => handleResetSuccess(false)}
      />
      <FeePlanResetToDraftDialog
        open={resetAndEditOpen}
        plan={plan}
        onClose={() => setResetAndEditOpen(false)}
        onSuccess={() => handleResetSuccess(true)}
        title={t('admin.finance.feePlansWorkspace.editPlan')}
        body={t('admin.finance.feePlansWorkspace.resetToDraftForEditMessage')}
        confirmLabel={t('admin.finance.feePlansWorkspace.resetToDraftAndEdit')}
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
        <span className="badge badge--slate">
          {t(
            pricingModeDisplayKey({
              frequency: display.frequencyUi,
              pricingMode: display.pricingMode,
            }),
          )}
        </span>
      </td>
      <td className="mono">
        <FinanceMoney amount={display.pricing.unitAmount} currency={currency} />
        {display.pricingMode === 'total_amount_installments' && display.installmentCount > 1 ? (
          <span className="muted fee-plan-detail-financial__suffix block">
            {t('admin.finance.feePlansWorkspace.detailInstallmentLumpFormula', {
              installment: display.installmentAmount ?? 0,
              count: display.installmentCount,
            })}
          </span>
        ) : null}
      </td>
      <td>{feeTypeFrequencyLabel(display.frequencyUi, t)}</td>
      <td>{display.installmentCount}</td>
      <td className="mono">
        {display.installmentAmount != null ? (
          <FinanceMoney amount={display.installmentAmount} currency={currency} />
        ) : (
          t('common.dash')
        )}
      </td>
      <td className="mono">
        <FinanceMoney amount={display.lineExpectedTotal} currency={currency} />
      </td>
      <td>
        <span className={`badge ${display.isOptional ? 'badge--slate' : 'badge--blue'}`}>
          {display.isOptional
            ? t('admin.finance.feePlansWorkspace.optionalBadge')
            : t('admin.finance.feePlansWorkspace.requiredBadge')}
        </span>
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
        <span className="badge badge--slate">
          {t(
            pricingModeDisplayKey({
              frequency: display.frequencyUi,
              pricingMode: display.pricingMode,
            }),
          )}
        </span>
      </div>
      <dl>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.pricing.unitOrTotalColumn')}</dt>
          <dd>
            <FinanceMoney amount={display.pricing.unitAmount} currency={currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.feeTypesWorkspace.frequency')}</dt>
          <dd>{feeTypeFrequencyLabel(display.frequencyUi, t)}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.detailInstallmentsColumn')}</dt>
          <dd>{display.installmentCount}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.pricing.installmentAmount')}</dt>
          <dd>
            {display.installmentAmount != null ? (
              <FinanceMoney amount={display.installmentAmount} currency={currency} />
            ) : (
              t('common.dash')
            )}
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.detailExpectedTotalColumn')}</dt>
          <dd>
            <FinanceMoney amount={display.lineExpectedTotal} currency={currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.detailMandatoryColumn')}</dt>
          <dd>
            {display.isOptional
              ? t('admin.finance.feePlansWorkspace.optionalBadge')
              : t('admin.finance.feePlansWorkspace.requiredBadge')}
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
