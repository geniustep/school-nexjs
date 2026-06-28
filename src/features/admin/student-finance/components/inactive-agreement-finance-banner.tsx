'use client';

import { useT } from '@/features/i18n/locale-context';
import { resolveFinanceAgreementStateLabel } from '../utils/reference-labels';
import type { InactiveAgreementPresentation } from '../utils/resolve-inactive-agreement-presentation';
import type { BillingContextPresentation } from '../utils/resolve-billing-context-presentation';
import type { StudentFinanceActionState } from '../utils/resolve-student-finance-action-state';

export function InactiveAgreementFinanceBanner({
  presentation,
  actionState,
  billingContext,
  inactiveAgreementState,
  onReviewAgreement,
  onCreateAgreement,
  onRegularizeAgreement,
  onOpenSchedule,
}: {
  presentation: InactiveAgreementPresentation;
  actionState: StudentFinanceActionState;
  billingContext: BillingContextPresentation;
  inactiveAgreementState?: string | null;
  onReviewAgreement: () => void;
  onCreateAgreement?: () => void;
  onRegularizeAgreement?: () => void;
  onOpenSchedule?: () => void;
}) {
  const t = useT();

  if (
    actionState.scenario !== 'history_without_active_agreement' ||
    !presentation.showWorkspaceBanner
  ) {
    return null;
  }

  const primary = actionState.primaryAction;
  // Case B (regularization): there is no agreement record to review, only
  // previously applied fees/installments. Drive the user toward creating an
  // agreement from the current installments — never reuse "review agreement".
  const isRegularize = primary?.kind === 'regularize_agreement';
  const primaryLabel = primary
    ? t(primary.labelKey)
    : t('admin.student360.financeWorkspace.actionState.reviewAgreement');
  const primaryHandler = isRegularize
    ? onRegularizeAgreement ?? onReviewAgreement
    : onReviewAgreement;
  // The redundant secondary "create" button only makes sense when the primary is
  // a real "review existing agreement" action.
  const showCreate = !isRegularize && actionState.canCreateAgreement && !!onCreateAgreement;
  const showOpenSchedule = isRegularize && !!onOpenSchedule;
  const inactiveStateLabel = inactiveAgreementState
    ? resolveFinanceAgreementStateLabel(t, inactiveAgreementState, { hasBillableContext: true })
    : null;

  const modifierClass = presentation.showRepairCard
    ? ' student-finance-inactive-agreement-banner--repair'
    : '';

  return (
    <section
      className={`student-finance-inactive-agreement-banner${modifierClass}`}
      role="alert"
    >
      <div className="student-finance-inactive-agreement-banner__copy">
        <p className="student-finance-inactive-agreement-banner__title">
          {isRegularize
            ? t('admin.student360.financeWorkspace.actionState.feesWithoutAgreement.title')
            : t('admin.student360.financeWorkspace.actionState.historyWithoutActive.title')}
        </p>
        <p className="student-finance-inactive-agreement-banner__body">
          {isRegularize
            ? t('admin.student360.financeWorkspace.actionState.feesWithoutAgreement.problem')
            : billingContext.billingContextMessage ??
              t('admin.student360.financeWorkspace.actionState.historyWithoutActive.problem')}
        </p>
        <p className="student-finance-inactive-agreement-banner__explain">
          {isRegularize
            ? t('admin.student360.financeWorkspace.actionState.feesWithoutAgreement.impact')
            : t('admin.student360.financeWorkspace.actionState.historyWithoutActive.impact')}
        </p>
        <p className="student-finance-inactive-agreement-banner__step tiny muted">
          {isRegularize
            ? t('admin.student360.financeWorkspace.actionState.feesWithoutAgreement.nextStep')
            : t('admin.student360.financeWorkspace.actionState.historyWithoutActive.nextStep')}
        </p>
        {presentation.hasInactiveAgreementRecord && inactiveStateLabel ? (
          <p className="student-finance-inactive-agreement-banner__state tiny muted">
            {t('admin.student360.financeWorkspace.inactiveAgreementReference.title')}: {inactiveStateLabel}
          </p>
        ) : null}
      </div>
      <div className="student-finance-inactive-agreement-banner__actions">
        <button
          type="button"
          className="btn btn--primary btn--sm student-finance-inactive-agreement-banner__action"
          onClick={primaryHandler}
        >
          {primaryLabel}
        </button>
        {showOpenSchedule ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm student-finance-inactive-agreement-banner__action"
            onClick={onOpenSchedule}
          >
            {t('admin.student360.financeWorkspace.actionState.openSchedule')}
          </button>
        ) : null}
        {showCreate ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm student-finance-inactive-agreement-banner__action"
            onClick={onCreateAgreement}
          >
            {t('admin.student360.financeWorkspace.actionState.createAgreement')}
          </button>
        ) : null}
      </div>
    </section>
  );
}

/** Contextual agreement state for badges inside finance screens. */
export function FinanceAgreementStateText({
  state,
  hasBillableContext = false,
}: {
  state: string;
  hasBillableContext?: boolean;
}) {
  const t = useT();
  const label =
    hasBillableContext && state !== 'active'
      ? resolveFinanceAgreementStateLabel(t, state, { hasBillableContext: true })
      : resolveFinanceAgreementStateLabel(t, state);
  return <>{label}</>;
}
