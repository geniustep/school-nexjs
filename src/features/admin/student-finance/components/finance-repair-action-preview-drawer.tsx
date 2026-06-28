'use client';

import { useCallback, useEffect, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import {
  applyFinanceRepairAction,
  previewFinanceRepairAction,
} from '../api/finance-admin-api';
import { normalizeFinanceRepairPreview } from '../utils/normalize-finance-repair-preview';
import { validateRepairApply } from '../utils/repair-action-guards';
import {
  actionRequiresAnyPlanSelection,
  actionRequiresDualPlanSelection,
  buildRepairActionPayload,
  isAdoptSelectionValid,
  type RepairPlanSelection,
} from '../utils/repair-action-plan-selection';
import type {
  FinanceRepairAction,
  FinanceRepairCandidatePlan,
  FinanceRepairReason,
  NormalizedFinanceRepairPreview,
} from '../types/finance-repair';

function tk(key: string): string {
  return `admin.student360.financeWorkspace.repairCenter.${key}`;
}

type DrawerStage = 'select_plan' | 'preview' | 'confirm';
type PlanRole = 'keep' | 'cancel' | 'official' | 'source';

function ReasonList({ reasons, className }: { reasons: FinanceRepairReason[]; className: string }) {
  if (reasons.length === 0) return null;
  return (
    <ul className={className}>
      {reasons.map((reason, index) => (
        <li key={`${reason.code}-${index}`} dir="auto">
          {reason.message ?? reason.code}
        </li>
      ))}
    </ul>
  );
}

function PlanOption({
  plan,
  role,
  groupName,
  selected,
  disabled,
  currencyName,
  onSelect,
}: {
  plan: FinanceRepairCandidatePlan;
  role: PlanRole;
  groupName: string;
  selected: boolean;
  disabled?: boolean;
  currencyName?: string | null;
  onSelect: () => void;
}) {
  const t = useT();
  const inputId = `${groupName}-${plan.id}`;
  const unusable = !plan.removable && (role === 'keep' || role === 'cancel');
  const isDisabled = disabled || unusable;
  const hintKey =
    role === 'keep'
      ? 'planSelection.keepHint'
      : role === 'cancel'
        ? 'planSelection.cancelHint'
        : role === 'official'
          ? 'planSelection.officialHint'
          : 'planSelection.sourceHint';
  return (
    <label
      htmlFor={inputId}
      className={`student-finance-repair-plan-option${selected ? ' student-finance-repair-plan-option--selected' : ''}${isDisabled ? ' student-finance-repair-plan-option--disabled' : ''}`}
    >
      <input
        id={inputId}
        type="radio"
        name={groupName}
        checked={selected}
        disabled={isDisabled}
        onChange={onSelect}
      />
      <div className="student-finance-repair-plan-option__body">
        <p className="student-finance-repair-plan-option__name" dir="auto">
          {plan.name}
        </p>
        <dl className="student-finance-repair-plan-option__meta">
          {plan.totalAmount != null ? (
            <div>
              <dt>{t(tk('planSelection.total'))}</dt>
              <dd>
                <FinanceMoney amount={plan.totalAmount} currency={currencyName ?? undefined} />
              </dd>
            </div>
          ) : null}
          {plan.feeCount != null ? (
            <div>
              <dt>{t(tk('planSelection.fees'))}</dt>
              <dd>{plan.feeCount}</dd>
            </div>
          ) : null}
          {plan.installmentCount != null ? (
            <div>
              <dt>{t(tk('planSelection.installments'))}</dt>
              <dd>{plan.installmentCount}</dd>
            </div>
          ) : null}
        </dl>
        {disabled ? (
          <p className="tiny muted">{t(tk('planSelection.alreadyChosen'))}</p>
        ) : unusable ? (
          <p className="tiny muted">{t(tk('planSelection.notRemovable'))}</p>
        ) : plan.hasPayments && (role === 'keep' || role === 'cancel') ? (
          <p className="tiny muted">{t(tk('planSelection.hasPayments'))}</p>
        ) : (
          <p className="tiny muted">{t(tk(hintKey))}</p>
        )}
      </div>
    </label>
  );
}

export function FinanceRepairActionPreviewDrawer({
  open,
  studentId,
  action,
  canApplyActions,
  currencyName,
  onClose,
  onApplied,
}: {
  open: boolean;
  studentId: number;
  action: FinanceRepairAction | null;
  canApplyActions: boolean;
  currencyName?: string | null;
  onClose: () => void;
  onApplied: () => void;
}) {
  const t = useT();
  const toast = useToast();

  const [stage, setStage] = useState<DrawerStage>('select_plan');
  const [primaryPlanId, setPrimaryPlanId] = useState<number | null>(null);
  const [sourceSchedulePlanId, setSourceSchedulePlanId] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<NormalizedFinanceRepairPreview | null>(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const actionCode = action?.code ?? null;
  const mode = action?.planSelectionMode ?? 'none';
  const isDual = actionRequiresDualPlanSelection(mode);
  const needsPlanSelection = actionRequiresAnyPlanSelection(mode);
  const selectablePlans = (action?.candidatePlans ?? []).filter(
    (p) => isDual || p.removable,
  );

  const currentSelection: RepairPlanSelection = {
    primaryPlanId,
    sourceSchedulePlanId,
  };

  const selectionReady = isDual
    ? isAdoptSelectionValid(currentSelection)
    : primaryPlanId != null;

  const resetState = useCallback(() => {
    const initialStage: DrawerStage =
      action && actionRequiresAnyPlanSelection(action.planSelectionMode)
        ? 'select_plan'
        : 'preview';
    setStage(initialStage);
    setPrimaryPlanId(null);
    setSourceSchedulePlanId(null);
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(false);
    setReason('');
    setConfirmed(false);
    setFormError(null);
    setApplying(false);
  }, [action]);

  useEffect(() => {
    if (!open || !action) return;
    resetState();
  }, [open, action, actionCode, resetState]);

  const loadPreview = useCallback(
    async (selection: RepairPlanSelection) => {
      if (!actionCode) return;
      setPreviewLoading(true);
      setPreviewError(null);
      setPreview(null);
      const payload = buildRepairActionPayload(actionCode, selection);
      const res = await previewFinanceRepairAction(studentId, actionCode, payload);
      setPreviewLoading(false);
      if (!res.success) {
        setPreviewError(t(tk('previewError')));
        return;
      }
      setPreview(normalizeFinanceRepairPreview(res.data));
      setStage('preview');
    },
    [actionCode, studentId, t],
  );

  useEffect(() => {
    if (!open || !actionCode || needsPlanSelection) return;
    void loadPreview({ primaryPlanId: null });
  }, [open, actionCode, needsPlanSelection, loadPreview]);

  const requiresReason = preview?.requiresReason ?? action?.requiresReason ?? false;
  const requiresConfirmation =
    preview?.requiresConfirmation ?? action?.requiresConfirmation ?? false;
  const allowed = (preview?.allowed ?? true) && (action?.canApply ?? true);
  const canExecute = canApplyActions && allowed;

  const handleApply = useCallback(async () => {
    if (!actionCode) return;
    const guard = validateRepairApply({ requiresReason, requiresConfirmation, reason, confirmed });
    if (!guard.ok) {
      setFormError(guard.errorKey ? t(guard.errorKey) : null);
      return;
    }
    setFormError(null);
    setApplying(true);
    const payload = {
      ...buildRepairActionPayload(actionCode, currentSelection),
      ...(requiresReason ? { reason: reason.trim() } : {}),
      ...(requiresConfirmation ? { confirmed: true } : {}),
    };
    const res = await applyFinanceRepairAction(studentId, actionCode, payload);
    setApplying(false);
    if (!res.success) {
      const status = (res.error.details as { status?: number } | undefined)?.status;
      if (res.error.code === 'forbidden' || status === 403) {
        toast.error(t(tk('applyForbidden')));
        return;
      }
      toast.error(t(tk('applyError')));
      return;
    }
    toast.success(t(tk('applySuccess')));
    onApplied();
  }, [
    actionCode,
    primaryPlanId,
    sourceSchedulePlanId,
    requiresReason,
    requiresConfirmation,
    reason,
    confirmed,
    studentId,
    t,
    toast,
    onApplied,
  ]);

  if (!open || !action) return null;

  const beforePlans = preview?.before.planNames ?? [];
  const currency = preview?.currency ?? currencyName ?? undefined;

  const drawerTitle =
    stage === 'select_plan'
      ? mode === 'keep'
        ? t(tk('planSelection.keepTitle'))
        : mode === 'cancel'
          ? t(tk('planSelection.cancelTitle'))
          : t(tk('planSelection.adoptTitle'))
      : stage === 'preview'
        ? t(tk('previewTitle'))
        : t(tk('confirmTitle'));

  const footer =
    stage === 'select_plan' ? (
      <div className="row">
        {selectablePlans.length > 0 ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={!selectionReady || previewLoading}
            onClick={() => void loadPreview(currentSelection)}
          >
            {previewLoading ? t(tk('previewLoading')) : t(tk('previewAction'))}
          </button>
        ) : null}
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
          {t('common.cancel')}
        </button>
      </div>
    ) : stage === 'preview' ? (
      <div className="row">
        {canExecute ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={previewLoading || !!previewError || !preview?.allowed}
            onClick={() => setStage('confirm')}
          >
            {t(tk('proceedToConfirm'))}
          </button>
        ) : null}
        {needsPlanSelection ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStage('select_plan')}>
            {t('common.back')}
          </button>
        ) : null}
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
          {t('common.cancel')}
        </button>
      </div>
    ) : (
      <div className="row">
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={applying}
          onClick={() => void handleApply()}
        >
          {applying ? t('common.submitting') : t(tk('applyButton'))}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={applying}
          onClick={() => setStage('preview')}
        >
          {t('common.back')}
        </button>
      </div>
    );

  return (
    <SetupDrawer
      open={open}
      size="medium"
      title={drawerTitle}
      subtitle={action.label ?? undefined}
      onClose={onClose}
      footer={footer}
    >
      {stage === 'select_plan' ? (
        <div className="form-stack student-finance-repair-plan-select">
          {isDual ? (
            <>
              <p className="muted">{t(tk('planSelection.adoptIntro'))}</p>
              {action.candidatePlans.length < 2 ? (
                <p className="form-error">{t(tk('planSelection.insufficientPlans'))}</p>
              ) : (
                <>
                  <fieldset className="student-finance-repair-plan-group">
                    <legend className="student-finance-repair-plan-group__legend">
                      {t(tk('planSelection.officialLegend'))}
                    </legend>
                    <div className="student-finance-repair-plan-select__list">
                      {action.candidatePlans.map((plan) => (
                        <PlanOption
                          key={`official-${plan.id}`}
                          plan={plan}
                          role="official"
                          groupName="repair-official-plan"
                          selected={primaryPlanId === plan.id}
                          disabled={sourceSchedulePlanId === plan.id}
                          currencyName={currencyName}
                          onSelect={() => setPrimaryPlanId(plan.id)}
                        />
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="student-finance-repair-plan-group">
                    <legend className="student-finance-repair-plan-group__legend">
                      {t(tk('planSelection.sourceLegend'))}
                    </legend>
                    <div className="student-finance-repair-plan-select__list">
                      {action.candidatePlans.map((plan) => (
                        <PlanOption
                          key={`source-${plan.id}`}
                          plan={plan}
                          role="source"
                          groupName="repair-source-plan"
                          selected={sourceSchedulePlanId === plan.id}
                          disabled={primaryPlanId === plan.id}
                          currencyName={currencyName}
                          onSelect={() => setSourceSchedulePlanId(plan.id)}
                        />
                      ))}
                    </div>
                  </fieldset>

                  {primaryPlanId != null &&
                  sourceSchedulePlanId != null &&
                  primaryPlanId === sourceSchedulePlanId ? (
                    <p className="form-error">{t(tk('planSelection.samePlanError'))}</p>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <>
              <p className="muted">
                {mode === 'keep'
                  ? t(tk('planSelection.keepIntro'))
                  : t(tk('planSelection.cancelIntro'))}
              </p>
              {selectablePlans.length === 0 ? (
                <p className="form-error">{t(tk('planSelection.insufficientPlans'))}</p>
              ) : (
                <div className="student-finance-repair-plan-select__list">
                  {action.candidatePlans.map((plan) => (
                    <PlanOption
                      key={plan.id}
                      plan={plan}
                      role={mode === 'keep' ? 'keep' : 'cancel'}
                      groupName="repair-plan-selection"
                      selected={primaryPlanId === plan.id}
                      currencyName={currencyName}
                      onSelect={() => setPrimaryPlanId(plan.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : stage === 'preview' ? (
        <div className="form-stack student-finance-repair-preview">
          <p className="muted">{t(tk('previewIntro'))}</p>
          {preview?.summary ? (
            <p className="student-finance-repair-preview__summary" dir="auto">
              {preview.summary}
            </p>
          ) : null}

          {previewLoading ? <p className="muted">{t(tk('previewLoading'))}</p> : null}
          {previewError ? <p className="form-error">{previewError}</p> : null}

          {preview ? (
            <>
              <section className="student-finance-repair-preview__section">
                <h4 className="student-finance-repair-preview__title">{t(tk('beforeTitle'))}</h4>
                <dl className="detail-list">
                  {preview.before.feeCount != null ? (
                    <div>
                      <dt>{t(tk('before.feeCount'))}</dt>
                      <dd>{preview.before.feeCount}</dd>
                    </div>
                  ) : null}
                  {preview.before.totalAmount != null ? (
                    <div>
                      <dt>{t(tk('before.totalAmount'))}</dt>
                      <dd>
                        <FinanceMoney amount={preview.before.totalAmount} currency={currency} />
                      </dd>
                    </div>
                  ) : null}
                  {preview.before.installmentCount != null ? (
                    <div>
                      <dt>{t(tk('before.installmentCount'))}</dt>
                      <dd>{preview.before.installmentCount}</dd>
                    </div>
                  ) : null}
                  {beforePlans.length > 0 ? (
                    <div>
                      <dt>{t(tk('before.plans'))}</dt>
                      <dd dir="auto">{beforePlans.join('، ')}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              <section className="student-finance-repair-preview__section">
                <h4 className="student-finance-repair-preview__title">{t(tk('afterTitle'))}</h4>
                <dl className="detail-list">
                  {preview.after.keptPlanName ? (
                    <div>
                      <dt>{isDual ? t(tk('after.officialPlan')) : t(tk('after.keptPlan'))}</dt>
                      <dd dir="auto">{preview.after.keptPlanName}</dd>
                    </div>
                  ) : null}
                  {isDual && preview.after.sourcePlanName ? (
                    <div>
                      <dt>{t(tk('after.sourcePlan'))}</dt>
                      <dd dir="auto">{preview.after.sourcePlanName}</dd>
                    </div>
                  ) : !isDual && preview.after.cancelledPlanName ? (
                    <div>
                      <dt>{t(tk('after.cancelledPlan'))}</dt>
                      <dd dir="auto">{preview.after.cancelledPlanName}</dd>
                    </div>
                  ) : null}
                  {preview.relinkedFeeCount != null ? (
                    <div>
                      <dt>{t(tk('after.relinkedFees'))}</dt>
                      <dd>{preview.relinkedFeeCount}</dd>
                    </div>
                  ) : null}
                  {preview.cancelledFeeCount != null ? (
                    <div>
                      <dt>{t(tk('after.cancelledFees'))}</dt>
                      <dd>{preview.cancelledFeeCount}</dd>
                    </div>
                  ) : null}
                  {preview.cancelledInstallmentCount != null ? (
                    <div>
                      <dt>{t(tk('after.cancelledInstallments'))}</dt>
                      <dd>{preview.cancelledInstallmentCount}</dd>
                    </div>
                  ) : null}
                  {preview.after.totalAmount != null ? (
                    <div>
                      <dt>{t(tk('after.totalAmount'))}</dt>
                      <dd>
                        <FinanceMoney amount={preview.after.totalAmount} currency={currency} />
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {preview.mode === 'relink_unpaid_records' ? (
                  <p className="tiny muted">{t(tk('previewMode.relinkUnpaid'))}</p>
                ) : null}
                {preview.rebuild === false ? (
                  <p className="tiny muted">{t(tk('previewMode.adoptScheduleAsIs'))}</p>
                ) : null}
              </section>

              {preview.warnings.length > 0 ? (
                <section className="student-finance-repair-preview__warnings" role="note">
                  <h4 className="student-finance-repair-preview__title">{t(tk('warningsTitle'))}</h4>
                  <ReasonList
                    reasons={preview.warnings}
                    className="student-finance-repair-reason-list"
                  />
                </section>
              ) : null}

              {preview.blockingReasons.length > 0 ? (
                <section className="student-finance-repair-preview__blockers" role="alert">
                  <h4 className="student-finance-repair-preview__title">
                    {t(tk('blockingReasonsTitle'))}
                  </h4>
                  <ReasonList
                    reasons={preview.blockingReasons}
                    className="student-finance-repair-reason-list student-finance-repair-reason-list--blocking"
                  />
                </section>
              ) : null}

              {!canApplyActions ? (
                <p className="tiny muted">{t(tk('readOnlyNotice'))}</p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <div className="form-stack student-finance-repair-confirm">
          <p className="muted">{t(tk('confirmIntro'))}</p>
          {preview?.confirmationLabel ? (
            <p className="student-finance-repair-confirm__label" dir="auto">
              {preview.confirmationLabel}
            </p>
          ) : null}

          {formError ? <p className="form-error">{formError}</p> : null}

          {requiresReason ? (
            <label className="form-field">
              <span>
                {t(tk('reasonLabel'))} <span aria-hidden="true">*</span>
              </span>
              <textarea
                className="input"
                rows={3}
                value={reason}
                placeholder={t(tk('reasonPlaceholder'))}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          ) : null}

          {requiresConfirmation ? (
            <label className="student-finance-repair-confirm__check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>{t(tk('confirmCheckbox'))}</span>
            </label>
          ) : null}
        </div>
      )}
    </SetupDrawer>
  );
}
