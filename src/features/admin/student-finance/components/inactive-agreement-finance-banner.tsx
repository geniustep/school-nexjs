'use client';

import { useT } from '@/features/i18n/locale-context';
import { resolveFinanceAgreementStateLabel } from '../utils/reference-labels';
import type { InactiveAgreementPresentation } from '../utils/resolve-inactive-agreement-presentation';
import type { BillingContextPresentation } from '../utils/resolve-billing-context-presentation';

export function InactiveAgreementFinanceBanner({
  presentation,
  billingContext,
  inactiveAgreementState,
  onReviewAgreement,
}: {
  presentation: InactiveAgreementPresentation;
  billingContext: BillingContextPresentation;
  inactiveAgreementState?: string | null;
  onReviewAgreement: () => void;
}) {
  const t = useT();

  if (!presentation.showWorkspaceBanner) return null;

  const reviewActionLabel = t('admin.student360.financeWorkspace.agreementRepair.reviewAction');

  if (presentation.showRepairCard) {
    return (
      <section className="student-finance-inactive-agreement-banner student-finance-inactive-agreement-banner--repair" role="alert">
        <div className="student-finance-inactive-agreement-banner__copy">
          <p className="student-finance-inactive-agreement-banner__title">
            {t('admin.student360.financeWorkspace.agreementRepair.title')}
          </p>
          <p className="student-finance-inactive-agreement-banner__body">
            {t('admin.student360.financeWorkspace.agreementRepair.body')}
          </p>
          <p className="student-finance-inactive-agreement-banner__explain">
            {billingContext.repairRecommendedActionKey
              ? t(billingContext.repairRecommendedActionKey)
              : t('admin.student360.financeWorkspace.agreementRepair.recommendedAction')}
          </p>
          {billingContext.showNoActiveAgreement ? (
            <p className="student-finance-inactive-agreement-banner__state tiny muted">
              {t('admin.student360.financeWorkspace.billingContext.noActiveAgreement')}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn--primary btn--sm student-finance-inactive-agreement-banner__action"
          onClick={onReviewAgreement}
        >
          {reviewActionLabel}
        </button>
      </section>
    );
  }

  const inactiveStateLabel = inactiveAgreementState
    ? resolveFinanceAgreementStateLabel(t, inactiveAgreementState, { hasBillableContext: true })
    : null;

  return (
    <section className="student-finance-inactive-agreement-banner" role="alert">
      <div className="student-finance-inactive-agreement-banner__copy">
        <p className="student-finance-inactive-agreement-banner__title">
          {billingContext.isOperationalWithoutActiveAgreement
            ? t('admin.student360.financeWorkspace.billingContext.operationalWithoutActiveAgreement')
            : t('admin.student360.financeWorkspace.inactiveAgreement.bannerTitle')}
        </p>
        <p className="student-finance-inactive-agreement-banner__body">
          {billingContext.billingContextMessage ??
            t('admin.student360.financeWorkspace.billingContext.noActiveAgreementExplanation')}
        </p>
        <p className="student-finance-inactive-agreement-banner__explain">
          {t('admin.student360.financeWorkspace.inactiveAgreement.planChangeBlockedHint')}
        </p>
        <p className="student-finance-inactive-agreement-banner__state tiny muted">
          {t('admin.student360.financeWorkspace.billingContext.noActiveAgreement')}
        </p>
        {presentation.hasInactiveAgreementRecord && inactiveStateLabel ? (
          <p className="student-finance-inactive-agreement-banner__state tiny muted">
            {t('admin.student360.financeWorkspace.inactiveAgreementReference.title')}: {inactiveStateLabel}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="btn btn--primary btn--sm student-finance-inactive-agreement-banner__action"
        onClick={onReviewAgreement}
      >
        {reviewActionLabel}
      </button>
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
