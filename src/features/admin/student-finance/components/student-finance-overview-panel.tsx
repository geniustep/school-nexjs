'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { StudentSectionSkeleton } from '@/features/admin/students/components/student-360-loading';
import type { StudentFinancePanelProps } from './student-finance-panel-props';
import {
  resolveBillingPartyLabel,
  resolveStudentFinanceOverviewMetrics,
} from '../utils/resolve-student-finance-overview';
import { resolveStudentBillingSourcePresentation } from '../utils/resolve-student-billing-source-presentation';
import { resolveFinanceAgreementStateLabel } from '../utils/reference-labels';
import { resolveChangePlanEligibility } from '../utils/resolve-change-plan-eligibility';
import { resolveBillingContextPresentation } from '../utils/resolve-billing-context-presentation';
import { FamilyFinanceSummarySection } from './family-finance-summary-section';
import { StudentFinanceLatestCollectionPreview } from './student-finance-latest-collection-preview';

function installmentStatusKey(state: string | null | undefined): string | null {
  if (!state) return null;
  const map: Record<string, string> = {
    upcoming: 'admin.student360.financeWorkspace.schedule.status.upcoming',
    due: 'admin.student360.financeWorkspace.schedule.status.due',
    partially_paid: 'admin.student360.financeWorkspace.schedule.status.partiallyPaid',
    paid: 'admin.student360.financeWorkspace.schedule.status.paid',
    overdue: 'admin.student360.financeWorkspace.schedule.status.overdue',
    cancelled: 'admin.student360.financeWorkspace.schedule.status.cancelled',
    pending_cheque: 'admin.student360.financeWorkspace.schedule.status.pendingChequeCoverage',
  };
  return map[state] ?? null;
}

function statusTone(state: string | null | undefined): string {
  if (!state) return 'neutral';
  if (state === 'overdue') return 'danger';
  if (state === 'paid') return 'ok';
  if (state === 'pending_cheque') return 'warn';
  if (state === 'due' || state === 'partially_paid') return 'warn';
  return 'neutral';
}

export function StudentFinanceOverviewPanel({
  studentId,
  workspace,
  financialOverview,
  financialOverviewLoading,
  financialOverviewError,
  onReloadFinancialOverview,
  canCollect,
  onOpenCollection,
}: StudentFinancePanelProps) {
  const t = useT();
  const { formatDate } = useFormat();

  const metrics = useMemo(
    () => resolveStudentFinanceOverviewMetrics(financialOverview),
    [financialOverview],
  );

  const billingSource = useMemo(
    () =>
      resolveStudentBillingSourcePresentation({
        financialOverview,
        workspaceAgreement: workspace?.current_agreement ?? null,
        workspace,
      }),
    [financialOverview, workspace],
  );

  const billingContext = useMemo(
    () =>
      resolveBillingContextPresentation({
        workspace,
        canCollectCapability: canCollect,
      }),
    [workspace, canCollect],
  );

  const financeEligibility = useMemo(
    () =>
      resolveChangePlanEligibility({
        workspace,
        financialOverview,
        studentCapabilities: { can_view_finance: true } as never,
      }),
    [workspace, financialOverview],
  );

  const showOperationalBillingContext =
    !billingSource.hasActiveAgreement &&
    financeEligibility.hasBillableFinanceContext &&
    (billingContext.isOperationalWithoutActiveAgreement ||
      billingContext.inactiveAgreement != null ||
      billingContext.showNoActiveAgreement);

  const billingLabel = resolveBillingPartyLabel({
    billingProfile: financialOverview?.billing_profile,
    billingPartyType: financialOverview?.billing_profile?.billing_party_type,
    t,
  });

  const chequeSummary = financialOverview?.cheque_summary;
  const showChequeSummary =
    chequeSummary != null &&
    (chequeSummary.pending_count > 0 ||
      chequeSummary.settled_count > 0 ||
      chequeSummary.rejected_count > 0 ||
      chequeSummary.cancelled_count > 0);
  const showChequeClassifications =
    showChequeSummary &&
    (chequeSummary!.settled_count > 0 ||
      chequeSummary!.rejected_count > 0 ||
      chequeSummary!.cancelled_count > 0 ||
      chequeSummary!.settled_amount > 0 ||
      chequeSummary!.rejected_amount > 0 ||
      chequeSummary!.cancelled_amount > 0);

  if (financialOverviewLoading && !metrics) {
    return <StudentSectionSkeleton rows={3} />;
  }

  if (financialOverviewError) {
    return (
      <div className="student-finance-summary-error" role="alert">
        <p>{t('admin.student360.financeOps.summaryLoadError')}</p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onReloadFinancialOverview}>
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const nextInstallment = financialOverview?.next_installment;
  const nextStatusKey = installmentStatusKey(metrics?.next_installment_state);
  const nextTitle = metrics?.next_installment_display_label;
  const nextTone = statusTone(metrics?.next_installment_state);
  const appliedPlans = financialOverview?.applied_plans ?? [];

  return (
    <div className="student-finance-overview">
      {billingContext.billingContextHeadlineKey ? (
        <div className="student-finance-billing-context-headline" role="status">
          <p className="student-finance-billing-context-headline__title">
            {t(billingContext.billingContextHeadlineKey)}
          </p>
          {billingContext.billingContextMessage ? (
            <p className="student-finance-billing-context-headline__hint tiny muted">
              {billingContext.billingContextMessage}
            </p>
          ) : billingContext.showNoActiveAgreement ? (
            <p className="student-finance-billing-context-headline__hint tiny muted">
              {t('admin.student360.financeWorkspace.billingContext.noActiveAgreementManageable')}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="student-finance-bento">
        <StudentFinanceLatestCollectionPreview
          studentId={studentId}
          workspace={workspace}
          financialOverview={financialOverview}
        />
        {nextInstallment ? (
          <article className="student-finance-bento__card student-finance-bento__card--featured">
            <header className="student-finance-bento__card-head">
              <div>
                <span className="student-finance-bento__eyebrow">
                  {t('admin.student360.financeWorkspace.metrics.nextInstallment')}
                </span>
                <h4 className="student-finance-bento__title" dir="auto">
                  {nextTitle ?? t('common.dash')}
                </h4>
              </div>
              <span className={`student-finance-status-pill student-finance-status-pill--${nextTone}`}>
                {nextStatusKey ? t(nextStatusKey) : metrics?.next_installment_state ?? t('common.dash')}
              </span>
            </header>
            <dl className="student-finance-bento__facts">
              {metrics?.next_installment_period ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.schedule.columns.period')}</dt>
                  <dd dir="auto">{metrics.next_installment_period}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t('admin.student360.financeWorkspace.metrics.nextInstallmentAmount')}</dt>
                <dd className="student-finance-bento__amount">
                  <FinanceMoney amount={nextInstallment.amount} currency={metrics?.currency ?? undefined} />
                </dd>
              </div>
              <div>
                <dt>{t('admin.student360.financeWorkspace.schedule.columns.dueDate')}</dt>
                <dd>
                  {metrics?.next_installment_date ? formatDate(metrics.next_installment_date) : t('common.dash')}
                </dd>
              </div>
            </dl>
            <div className="student-finance-bento__card-actions">
              <Link
                href={`/admin/students/${studentId}?tab=finance&financeSubTab=schedule`}
                className="btn btn--ghost btn--sm"
              >
                {t('admin.student360.financeWorkspace.openSchedule')}
              </Link>
              {billingContext.collectPaymentAllowed ? (
                <button type="button" className="btn btn--primary btn--sm" onClick={onOpenCollection}>
                  {t('admin.student360.financeWorkspace.actions.recordPayment')}
                </button>
              ) : canCollect && !billingContext.shouldHideCollectButton ? (
                <span
                  className="student-finance-collect-blocked"
                  title={
                    billingContext.collectBlockMessage ??
                    (billingContext.collectBlockMessageKey
                      ? t(billingContext.collectBlockMessageKey)
                      : undefined)
                  }
                >
                  <button type="button" className="btn btn--primary btn--sm" disabled>
                    {t('admin.student360.financeWorkspace.actions.recordPayment')}
                  </button>
                  <span className="student-finance-collect-blocked__hint tiny muted">
                    {billingContext.collectBlockMessage ??
                      (billingContext.collectBlockMessageKey
                        ? t(billingContext.collectBlockMessageKey)
                        : t('admin.student360.financeWorkspace.collectPayment.blockedMessage'))}
                  </span>
                </span>
              ) : null}
            </div>
          </article>
        ) : null}

        {showChequeSummary && chequeSummary ? (
          <article className="student-finance-bento__card student-finance-bento__card--cheques">
            <header className="student-finance-bento__card-head">
              <span className="student-finance-bento__eyebrow">
                {t('admin.student360.financeWorkspace.metrics.chequeSummary')}
              </span>
              <Link
                href={`/admin/students/${studentId}?tab=finance&financeSubTab=cheques`}
                className="btn btn--ghost btn--sm"
              >
                {t('common.view')}
              </Link>
            </header>
            <div className="student-finance-cheque-stats">
              {chequeSummary.pending_count > 0 ? (
                <div className="student-finance-cheque-stat student-finance-cheque-stat--pending">
                  <span className="student-finance-cheque-stat__count">{chequeSummary.pending_count}</span>
                  <span className="student-finance-cheque-stat__label">
                    {t('admin.student360.financeWorkspace.metrics.pendingCheques')}
                  </span>
                  <FinanceMoney
                    amount={chequeSummary.pending_amount}
                    currency={metrics?.currency ?? undefined}
                    className="student-finance-cheque-stat__amount"
                  />
                </div>
              ) : null}
              {showChequeClassifications ? (
                <>
                  <div className="student-finance-cheque-stat student-finance-cheque-stat--settled">
                    <span className="student-finance-cheque-stat__count">{chequeSummary.settled_count}</span>
                    <span className="student-finance-cheque-stat__label">
                      {t('admin.student360.financeWorkspace.metrics.clearedCheques')}
                    </span>
                    <FinanceMoney
                      amount={chequeSummary.settled_amount}
                      currency={metrics?.currency ?? undefined}
                      className="student-finance-cheque-stat__amount"
                    />
                  </div>
                  <div className="student-finance-cheque-stat student-finance-cheque-stat--rejected">
                    <span className="student-finance-cheque-stat__count">{chequeSummary.rejected_count}</span>
                    <span className="student-finance-cheque-stat__label">
                      {t('admin.student360.financeWorkspace.metrics.rejectedOrReturnedCheques')}
                    </span>
                    <FinanceMoney
                      amount={chequeSummary.rejected_amount}
                      currency={metrics?.currency ?? undefined}
                      className="student-finance-cheque-stat__amount"
                    />
                  </div>
                  <div className="student-finance-cheque-stat student-finance-cheque-stat--cancelled">
                    <span className="student-finance-cheque-stat__count">{chequeSummary.cancelled_count}</span>
                    <span className="student-finance-cheque-stat__label">
                      {t('admin.student360.financeWorkspace.metrics.cancelledCheques')}
                    </span>
                    <FinanceMoney
                      amount={chequeSummary.cancelled_amount}
                      currency={metrics?.currency ?? undefined}
                      className="student-finance-cheque-stat__amount"
                    />
                  </div>
                </>
              ) : null}
            </div>
            {chequeSummary.cancelled_count > 0 ? (
              <p className="student-finance-cheque-note tiny muted" role="note">
                {chequeSummary.cancelled_note?.trim() ||
                  t('admin.student360.financeWorkspace.metrics.cancelledChequesNote')}
              </p>
            ) : null}
          </article>
        ) : null}

        <article className="student-finance-bento__card">
          <header className="student-finance-bento__card-head">
            <span className="student-finance-bento__eyebrow">
              {t('admin.student360.financeWorkspace.billingPartyTitle')}
            </span>
          </header>
          <dl className="student-finance-bento__facts student-finance-bento__facts--stacked">
            <div>
              <dt>{t('admin.finance.billingPartner')}</dt>
              <dd dir="auto">{billingLabel}</dd>
            </div>
            {financialOverview?.billing_profile?.effective_from ? (
              <div>
                <dt>{t('admin.student360.financeWorkspace.billingEffectiveFrom')}</dt>
                <dd>{formatDate(financialOverview.billing_profile.effective_from)}</dd>
              </div>
            ) : null}
            {financialOverview?.academic_year?.name ? (
              <div>
                <dt>{t('admin.student360.finance.academicYear')}</dt>
                <dd>{financialOverview.academic_year.name}</dd>
              </div>
            ) : null}
          </dl>
        </article>

        <article className="student-finance-bento__card student-finance-bento__card--billing-source">
          <header className="student-finance-bento__card-head">
            <span className="student-finance-bento__eyebrow">
              {billingSource.hasActiveAgreement
                ? t('admin.student360.financeWorkspace.billingSourceTitle')
                : t('admin.student360.financeWorkspace.appliedPlansTitle')}
            </span>
            {billingSource.hasActiveAgreement ? (
              <Link
                href={`/admin/students/${studentId}?tab=finance&financeSubTab=agreements`}
                className="btn btn--ghost btn--sm"
              >
                {t('admin.student360.financeWorkspace.openAgreement')}
              </Link>
            ) : null}
          </header>
          {billingSource.hasActiveAgreement ? (
            <div className="student-finance-billing-source">
              <p className="student-finance-billing-source__headline">
                {t('admin.student360.financeWorkspace.billingSourceActiveAgreement')}
              </p>
              <p className="student-finance-billing-source__hint tiny muted">
                {t('admin.student360.financeWorkspace.billingSourcePlanTemplateHint')}
              </p>
              <p className="student-finance-billing-source__plan" dir="auto">
                {billingSource.originalPlanName
                  ? t('admin.student360.financeWorkspace.billingSourceBuiltOnPlan', {
                      plan: billingSource.originalPlanName,
                    })
                  : t('admin.student360.financeWorkspace.billingSourceBuiltOnFeePlanGeneric')}
              </p>
              <dl className="student-finance-bento__facts student-finance-bento__facts--stacked">
                {billingSource.agreementNumber ? (
                  <div>
                    <dt>{t('admin.student360.financeWorkspace.billingSourceCurrentAgreement')}</dt>
                    <dd dir="auto">{billingSource.agreementNumber}</dd>
                  </div>
                ) : null}
                {billingSource.agreementState === 'active' ? (
                  <div>
                    <dt>{t('admin.student360.financeWorkspace.billingSourceStatus')}</dt>
                    <dd>{t('admin.student360.financeWorkspace.billingSourceStatusActive')}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : showOperationalBillingContext ? (
            <div className="student-finance-billing-source student-finance-billing-source--inactive">
              <p className="student-finance-billing-source__headline">
                {t('admin.student360.financeWorkspace.billingContext.noActiveAgreement')}
              </p>
              <p className="student-finance-billing-source__hint">
                {billingContext.billingContextMessage ??
                  t('admin.student360.financeWorkspace.billingContext.noActiveAgreementExplanation')}
              </p>
              {billingContext.inactiveAgreement?.state ? (
                <dl className="student-finance-bento__facts student-finance-bento__facts--stacked">
                  <div>
                    <dt>{t('admin.student360.financeWorkspace.inactiveAgreementReference.title')}</dt>
                    <dd dir="auto">
                      {billingSource.agreementNumber ?? t('common.dash')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('admin.student360.financeWorkspace.inactiveAgreementReference.stateLabel')}</dt>
                    <dd>
                      {resolveFinanceAgreementStateLabel(t, billingContext.inactiveAgreement.state, {
                        hasBillableContext: true,
                      })}
                    </dd>
                  </div>
                </dl>
              ) : null}
              <Link
                href={`/admin/students/${studentId}?tab=finance&financeSubTab=agreements`}
                className="btn btn--ghost btn--sm"
              >
                {t('admin.student360.financeWorkspace.agreementRepair.reviewAction')}
              </Link>
            </div>
          ) : appliedPlans.length ? (
            <div className="student-finance-plan-list">
              {appliedPlans.map((plan) => (
                <div key={plan.id} className="student-finance-plan-item">
                  <div className="student-finance-plan-item__head">
                    <strong dir="auto">{plan.name}</strong>
                    <Link href={`/admin/finance/fee-plans/${plan.id}`} className="btn btn--ghost btn--sm">
                      {t('admin.student360.financeWorkspace.openPlan')}
                    </Link>
                  </div>
                  <div className="student-finance-plan-item__metrics">
                    <div>
                      <span>{t('admin.student360.financeWorkspace.metrics.annualTotal')}</span>
                      <FinanceMoney amount={plan.total_fees} currency={metrics?.currency ?? undefined} />
                    </div>
                    <div>
                      <span>{t('admin.student360.financeWorkspace.metrics.paidConfirmed')}</span>
                      <FinanceMoney amount={plan.paid} currency={metrics?.currency ?? undefined} />
                    </div>
                    <div>
                      <span>{t('admin.student360.financeWorkspace.metrics.remainingActual')}</span>
                      <FinanceMoney amount={plan.remaining} currency={metrics?.currency ?? undefined} />
                    </div>
                  </div>
                  <p className="student-finance-plan-item__meta tiny muted">
                    {t('admin.student360.financeWorkspace.feesCount')}: {plan.fees_count}
                    {' · '}
                    {t('admin.student360.financeWorkspace.installmentsCount')}: {plan.installments_count}
                    {plan.state ? ` · ${plan.state}` : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="student-finance-bento__empty">
              {t('admin.student360.financeWorkspace.noAppliedPlans')}
            </p>
          )}
        </article>
      </div>

      <FamilyFinanceSummarySection studentId={studentId} />
    </div>
  );
}
