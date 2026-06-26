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
}: {
  presentation: InactiveAgreementPresentation;
  actionState: StudentFinanceActionState;
  billingContext: BillingContextPresentation;
  inactiveAgreementState?: string | null;
  onReviewAgreement: () => void;
  onCreateAgreement?: () => void;
}) {
  const t = useT();

  if (
    actionState.scenario !== 'history_without_active_agreement' ||
    !presentation.showWorkspaceBanner
  ) {
    return null;
  }

  const reviewActionLabel = t('admin.student360.financeWorkspace.actionState.reviewAgreement');
  const showCreate = actionState.canCreateAgreement && !!onCreateAgreement;
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
          {t('admin.student360.financeWorkspace.actionState.historyWithoutActive.title')}
        </p>
        <p className="student-finance-inactive-agreement-banner__body">
          {billingContext.billingContextMessage ??
            t('admin.student360.financeWorkspace.actionState.historyWithoutActive.problem')}
        </p>
        <p className="student-finance-inactive-agreement-banner__explain">
          {t('admin.student360.financeWorkspace.actionState.historyWithoutActive.impact')}
        </p>
        <p className="student-finance-inactive-agreement-banner__step tiny muted">
          {t('admin.student360.financeWorkspace.actionState.historyWithoutActive.nextStep')}
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
          onClick={onReviewAgreement}
        >
          {reviewActionLabel}
        </button>
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
