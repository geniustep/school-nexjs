'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { LoadingState } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { useT, useLocale } from '@/features/i18n/locale-context';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { Student360CompactEmpty } from '@/features/admin/students/components/student-360-compact-empty';
import {
  StudentCreateFinanceCustomization,
  StudentCreateFinancePlanPicker,
} from '@/features/admin/students/components/student-create-finance-panels';
import { formatFinanceCurrency } from '@/features/admin/students/utils/student-finance-format';
import {
  candidatePlanLevelNames,
  candidatePlanScopeSummary,
  candidatePlanTotal,
  defaultStudentCreateFinanceFormState,
} from '@/features/admin/students/utils/student-enrollment-finance';
import type {
  FeePlanCandidatePlan,
  StudentCreateFinanceFormState,
} from '@/types/student-enrollment-finance';
import type { AssignPlanPreviewState } from '@/types/student-finance-assign-plan';
import {
  assignStudentFinancePlan,
  buildAssignPlanBody,
  previewStudentFinancePlan,
} from '../api/assign-plan-api';
import { classifyAssignPlanPreview } from '../utils/normalize-assign-plan-preview';
import { resolveAssignErrorMessage } from '@/features/admin/finance/fee-plan-assign-errors';
import { PreActiveAgreementFinancePanel } from './pre-active-agreement-finance-panel';
import type { PreActiveFinancialAgreementRef } from '../utils/resolve-pre-active-financial-agreement';

function tk(key: string): string {
  return `admin.student360.finance.assignPlan.${key}`;
}

function humanizeAction(action: string): string {
  const cleaned = action.replace(/[_-]+/g, ' ').trim();
  if (!cleaned) return action;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function translateAction(t: ReturnType<typeof useT>, action: string): string {
  const key = tk(`actionLabels.${action}`);
  const label = t(key);
  // `translate` returns the key itself when no message is found; fall back to a
  // human-readable version so raw codes never leak into the UI.
  return label === key ? humanizeAction(action) : label;
}

type AssignPlanActionKey =
  | 'assign_plan'
  | 'confirm_plan'
  | 'customize_plan'
  | 'select_other_plan'
  | 'edit_plan'
  | 'preview_plan';

function isAssignPlanActionKey(action: string): action is AssignPlanActionKey {
  return (
    action === 'assign_plan' ||
    action === 'confirm_plan' ||
    action === 'customize_plan' ||
    action === 'select_other_plan' ||
    action === 'edit_plan' ||
    action === 'preview_plan'
  );
}

function CandidateCard({
  candidate,
  onUse,
  disabled,
}: {
  candidate: FeePlanCandidatePlan;
  onUse: (planId: number) => void;
  disabled: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [showLevelDetails, setShowLevelDetails] = useState(false);
  const total = candidatePlanTotal(candidate);
  const currency = candidate.currency ? { name: candidate.currency, symbol: candidate.currency } : null;
  const levelNames = candidatePlanLevelNames(candidate);
  const fullScope = candidatePlanScopeSummary(candidate);
  // Keep the primary card compact: show a short summary and hide a long level
  // list behind a secondary "عرض التفاصيل" toggle.
  const hasLevelDetails = levelNames.length > 1;
  const shortScope = hasLevelDetails
    ? t(tk('candidateScopeLevelsCount'), { count: levelNames.length })
    : fullScope;
  const year = candidate.academic_year?.name ?? candidate.academic_year_name ?? null;
  const reason = candidate.hint?.trim() || t(tk('candidateReasonNotDefault'));

  return (
    <li className="assign-finance-plan__candidate-card card">
      <div className="assign-finance-plan__candidate-head">
        <strong dir="auto">
          {candidate.name}
          <span className="mono tiny muted"> #{candidate.id}</span>
        </strong>
      </div>
      <dl className="detail-list compact assign-finance-plan__candidate-meta">
        {year ? (
          <div>
            <dt>{t(tk('academicYear'))}</dt>
            <dd dir="auto">{year}</dd>
          </div>
        ) : null}
        {total != null ? (
          <div>
            <dt>{t(tk('total'))}</dt>
            <dd className="mono">{formatFinanceCurrency(total, currency, locale)}</dd>
          </div>
        ) : null}
        {shortScope ? (
          <div>
            <dt>{t(tk('level'))}</dt>
            <dd dir="auto">
              <span>{shortScope}</span>
              {hasLevelDetails ? (
                <>
                  <button
                    type="button"
                    className="assign-finance-plan__candidate-details-toggle"
                    aria-expanded={showLevelDetails}
                    onClick={() => setShowLevelDetails((v) => !v)}
                  >
                    {showLevelDetails
                      ? t(tk('candidateScopeHideDetails'))
                      : t(tk('candidateScopeShowDetails'))}
                  </button>
                  {showLevelDetails ? (
                    <ul className="assign-finance-plan__candidate-levels tiny muted">
                      {levelNames.map((name) => (
                        <li key={name} dir="auto">
                          {name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>{t(tk('candidateReasonLabel'))}</dt>
          <dd dir="auto">{reason}</dd>
        </div>
      </dl>
      <div className="assign-finance-plan__candidate-actions row">
        <Link
          className="btn btn--ghost btn--sm"
          href={`/admin/finance/fee-plans/${candidate.id}`}
          target="_blank"
          rel="noreferrer"
        >
          {t('common.view')}
        </Link>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={disabled}
          onClick={() => onUse(candidate.id)}
        >
          {t(tk('useThisPlan'))}
        </button>
      </div>
    </li>
  );
}

export function AssignFinancePlanPanel({
  studentId,
  academicYearId,
  enrollmentEditHref,
  emptyTitle,
  emptyDescription,
  onAssigned,
  assignPlanBlocked = false,
  preActiveAgreement = null,
  onReviewAgreement,
}: {
  studentId: number;
  academicYearId?: string | null;
  enrollmentEditHref?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onAssigned: () => void;
  assignPlanBlocked?: boolean;
  preActiveAgreement?: PreActiveFinancialAgreementRef | null;
  onReviewAgreement?: () => void;
}) {
  const t = useT();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [state, setState] = useState<AssignPlanPreviewState | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeAction, setActiveAction] = useState<AssignPlanActionKey | null>(null);
  const [financeState, setFinanceState] = useState<StudentCreateFinanceFormState | null>(null);

  const academicYearNum =
    academicYearId && Number.isFinite(Number(academicYearId)) ? Number(academicYearId) : null;

  const resetActionState = useCallback(() => {
    setActiveAction(null);
    setFinanceState(null);
  }, []);

  const runPreview = useCallback(
    async (feePlanId?: number) => {
      setPreviewLoading(true);
      setState(null);
      resetActionState();
      const res = await previewStudentFinancePlan(studentId, {
        ...(academicYearNum != null ? { academic_year_id: academicYearNum } : {}),
        ...(feePlanId != null ? { fee_plan_id: feePlanId } : {}),
      });
      setPreviewLoading(false);
      setState(classifyAssignPlanPreview(res));
    },
    [studentId, academicYearNum, resetActionState],
  );

  useEffect(() => {
    if (state?.kind !== 'ready' || !state.plan.suggestSnapshot) {
      setFinanceState(null);
      return;
    }
    setFinanceState(defaultStudentCreateFinanceFormState(state.plan.suggestSnapshot));
    setActiveAction(null);
  }, [state]);

  function openPanel() {
    if (assignPlanBlocked) {
      toast.error(t('admin.student360.finance.assignPlan.preActive.blockedToast'));
      onReviewAgreement?.();
      return;
    }
    setOpen(true);
    void runPreview();
  }

  function closePanel() {
    setOpen(false);
    setState(null);
    setShowConfirm(false);
    resetActionState();
  }

  async function handleAssign() {
    if (assignPlanBlocked) {
      toast.error(t('admin.student360.finance.assignPlan.preActive.blockedToast'));
      return;
    }
    if (state?.kind !== 'ready' || state.plan.feePlanId == null) return;
    const suggest = state.plan.suggestSnapshot;
    setAssignLoading(true);
    const res = await assignStudentFinancePlan(
      studentId,
      buildAssignPlanBody({
        feePlanId: state.plan.feePlanId,
        academicYearId: state.plan.academicYearId ?? academicYearNum,
        financeState,
        suggestPeriods: suggest?.suggested_periods,
      }),
    );
    setAssignLoading(false);
    setShowConfirm(false);
    if (!res.success) {
      const reclassified = classifyAssignPlanPreview(res);
      if (reclassified.kind !== 'error') {
        setState(reclassified);
        return;
      }
      toast.error(resolveAssignErrorMessage(res.error.code, res.error.message, t));
      return;
    }
    toast.success(t(tk('assignSuccess')));
    closePanel();
    onAssigned();
  }

  if (assignPlanBlocked && preActiveAgreement) {
    return (
      <PreActiveAgreementFinancePanel
        studentId={studentId}
        agreement={preActiveAgreement}
        onReviewAgreement={onReviewAgreement}
      />
    );
  }

  return (
    <>
      <Student360CompactEmpty
        title={emptyTitle ?? t(tk('emptyTitle'))}
        description={emptyDescription ?? t(tk('emptyDescription'))}
        action={
          <button type="button" className="btn btn--primary" onClick={openPanel}>
            {t(tk('setupAction'))}
          </button>
        }
      />

      <SetupDrawer
        open={open}
        title={t(tk('panelTitle'))}
        subtitle={t(tk('panelSubtitle'))}
        onClose={closePanel}
        className="assign-finance-plan-drawer"
        iconClose
      >
        {previewLoading ? <LoadingState label={t(tk('loadingPreview'))} /> : null}

        {!previewLoading && state ? (
          <AssignPreviewBody
            state={state}
            enrollmentEditHref={enrollmentEditHref}
            assignLoading={assignLoading}
            activeAction={activeAction}
            financeState={financeState}
            onActiveActionChange={setActiveAction}
            onFinanceChange={(patch) =>
              setFinanceState((prev) => (prev ? { ...prev, ...patch } : prev))
            }
            onUseCandidate={(planId) => void runPreview(planId)}
            onRetry={() => void runPreview()}
            onConfirm={() => setShowConfirm(true)}
            onCancel={closePanel}
          />
        ) : null}
      </SetupDrawer>

      <ConfirmationDialog
        open={showConfirm}
        title={t(tk('confirmTitle'))}
        body={t(tk('confirmBody'))}
        confirmLabel={t(tk('confirm'))}
        cancelLabel={t('common.cancel')}
        loading={assignLoading}
        onConfirm={handleAssign}
        onClose={() => setShowConfirm(false)}
      />
    </>
  );
}

function AssignPreviewBody({
  state,
  enrollmentEditHref,
  assignLoading,
  activeAction,
  financeState,
  onActiveActionChange,
  onFinanceChange,
  onUseCandidate,
  onRetry,
  onConfirm,
  onCancel,
}: {
  state: AssignPlanPreviewState;
  enrollmentEditHref?: string;
  assignLoading: boolean;
  activeAction: AssignPlanActionKey | null;
  financeState: StudentCreateFinanceFormState | null;
  onActiveActionChange: (action: AssignPlanActionKey | null) => void;
  onFinanceChange: (patch: Partial<StudentCreateFinanceFormState>) => void;
  onUseCandidate: (planId: number) => void;
  onRetry: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();

  if (state.kind === 'active_agreement_exists') {
    return (
      <div className="assign-finance-plan__notice" role="status">
        <p>{t(tk('activeAgreementExists'))}</p>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('common.close')}
        </button>
      </div>
    );
  }

  if (state.kind === 'missing_academic_enrollment') {
    return (
      <div className="assign-finance-plan__notice" role="status">
        <p>{t(tk('missingAcademicEnrollment'))}</p>
        {enrollmentEditHref ? (
          <Link href={enrollmentEditHref} className="btn btn--ghost btn--sm">
            {t(tk('editEnrollment'))}
          </Link>
        ) : null}
      </div>
    );
  }

  if (state.kind === 'no_eligible_plan') {
    return (
      <div className="assign-finance-plan__notice" role="status">
        <p>{t(tk('noEligiblePlan'))}</p>
        <p className="tiny muted">{t(tk('noEligiblePlanHint'))}</p>
      </div>
    );
  }

  if (state.kind === 'candidate_selection') {
    return (
      <div className="assign-finance-plan__candidates stack">
        <p className="assign-finance-plan__candidates-title">{t(tk('candidatesTitle'))}</p>
        <p className="tiny muted">{t(tk('candidatesHint'))}</p>
        <ul className="assign-finance-plan__candidate-list">
          {state.candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onUse={onUseCandidate}
              disabled={assignLoading}
            />
          ))}
        </ul>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="assign-finance-plan__notice" role="alert">
        <p className="form-error">{state.message ?? t(tk('previewError'))}</p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          {t(tk('retry'))}
        </button>
      </div>
    );
  }

  const { plan } = state;
  const suggest = plan.suggestSnapshot;

  function handleActionClick(action: string) {
    if (!isAssignPlanActionKey(action)) return;

    if (action === 'assign_plan' || action === 'confirm_plan') {
      onConfirm();
      return;
    }

    if (action === 'edit_plan') {
      if (plan.feePlanId == null) return;
      window.open(`/admin/finance/fee-plans/${plan.feePlanId}`, '_blank', 'noopener,noreferrer');
      return;
    }

    if (action === 'customize_plan') {
      const next = activeAction === 'customize_plan' ? null : 'customize_plan';
      onActiveActionChange(next);
      if (next === 'customize_plan') {
        onFinanceChange({ customizePlan: true });
      }
      return;
    }

    if (action === 'select_other_plan') {
      onActiveActionChange(activeAction === 'select_other_plan' ? null : 'select_other_plan');
      return;
    }

    if (action === 'preview_plan') {
      onActiveActionChange(activeAction === 'preview_plan' ? null : 'preview_plan');
    }
  }

  function handleSelectPlan(planId: number) {
    onFinanceChange({ selectedFeePlanId: planId });
    onUseCandidate(planId);
  }

  return (
    <div className="assign-finance-plan__preview">
      <div className="afp-summary">
        {plan.planName ? (
          <div className="afp-summary__plan">
            <span className="afp-summary__plan-label">{t(tk('planName'))}</span>
            <strong className="afp-summary__plan-name" dir="auto">
              {plan.planName}
            </strong>
          </div>
        ) : null}
        {plan.total != null ? (
          <div className="afp-summary__total">
            <span className="afp-summary__total-label">{t(tk('total'))}</span>
            <span className="afp-summary__total-value">
              <FinanceMoney amount={plan.total} currency={plan.currency ?? undefined} />
            </span>
          </div>
        ) : null}
      </div>

      <dl className="afp-meta">
        {plan.academicYearName ? (
          <div className="afp-meta__item">
            <dt>{t(tk('academicYear'))}</dt>
            <dd dir="auto">{plan.academicYearName}</dd>
          </div>
        ) : null}
        {plan.levelName ? (
          <div className="afp-meta__item">
            <dt>{t(tk('level'))}</dt>
            <dd dir="auto">{plan.levelName}</dd>
          </div>
        ) : null}
        {plan.installmentCount != null ? (
          <div className="afp-meta__item">
            <dt>{t(tk('installmentCount'))}</dt>
            <dd>{plan.installmentCount}</dd>
          </div>
        ) : null}
      </dl>

      {plan.allowedActions.length > 0 ? (
        <div className="afp-actions-hint">
          <span className="afp-actions-hint__label">{t(tk('allowedActions'))}</span>
          <ul className="afp-chips">
            {plan.allowedActions.map((action) => {
              const actionable = isAssignPlanActionKey(action);
              const isActive = actionable && activeAction === action;
              return (
                <li key={action}>
                  <button
                    type="button"
                    className={`afp-chip afp-chip--action${isActive ? ' afp-chip--active' : ''}`}
                    disabled={assignLoading || !actionable}
                    aria-pressed={isActive}
                    onClick={() => handleActionClick(action)}
                  >
                    {translateAction(t, action)}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {activeAction === 'select_other_plan' && suggest ? (
        <div className="afp-action-panel">
          <StudentCreateFinancePlanPicker
            suggest={suggest}
            financeState={financeState ?? defaultStudentCreateFinanceFormState(suggest)}
            onSelectPlan={handleSelectPlan}
          />
        </div>
      ) : null}

      {activeAction === 'customize_plan' && suggest && financeState ? (
        <div className="afp-action-panel">
          <StudentCreateFinanceCustomization
            suggest={suggest}
            financeState={financeState}
            previewError={null}
            onFinanceChange={onFinanceChange}
          />
        </div>
      ) : null}

      {activeAction === 'preview_plan' && suggest?.plan_lines && suggest.plan_lines.length > 0 ? (
        <div className="afp-action-panel afp-action-panel--lines">
          <ul className="afp-plan-lines">
            {suggest.plan_lines.map((line) => (
              <li key={line.line_id} className="afp-plan-lines__item">
                <span dir="auto">{line.fee_type_name}</span>
                <span className="mono">
                  {formatFinanceCurrency(
                    line.total_amount ?? line.amount ?? line.base_amount,
                    suggest.currency,
                    locale,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="afp-footer">
        <button
          type="button"
          className="btn btn--primary afp-footer__confirm"
          disabled={!plan.canAssign || plan.feePlanId == null || assignLoading}
          onClick={onConfirm}
        >
          {t(tk('confirm'))}
        </button>
        <button
          type="button"
          className="btn btn--ghost afp-footer__cancel"
          onClick={onCancel}
          disabled={assignLoading}
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
