'use client';

import { useMemo, useState } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type { StudentDetailsData } from '@/types/student-360';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { FinancialAgreement, StudentFinanceWorkspace } from '../types';
import { resolveFeePlanPresentation } from '../utils/resolve-fee-plan-presentation';
import { resolveFinanceAgreementStateLabel } from '../utils/reference-labels';
import { isAgreementAmendmentAllowed } from '../utils/resolve-agreement-amendment-action';
import { StudentFinanceAgreementAmendmentDialog } from './student-finance-agreement-amendment-dialog';
import styles from './student-finance-overview-panel.module.css';

function agreementStatusClass(
  status: ReturnType<typeof resolveFeePlanPresentation>['agreementUiStatus'],
): string {
  if (status === 'active') return styles.statusOk;
  if (status === 'draft' || status === 'pending_approval' || status === 'approved') {
    return styles.statusWarn;
  }
  if (status === 'cancelled' || status === 'requires_review') return styles.statusDanger;
  return styles.statusNeutral;
}

export function StudentFinanceAgreementContextPanel({
  studentId,
  details,
  workspace,
  financialOverview,
  agreement,
  onOpenAgreements,
  onCreateAgreement,
  onRefresh,
}: {
  studentId: number;
  details: StudentDetailsData;
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
  agreement?: FinancialAgreement | null;
  collectBlockReason?: string | null;
  onOpenAgreements?: () => void;
  onCreateAgreement?: () => void;
  onRefresh?: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const [amendmentOpen, setAmendmentOpen] = useState(false);

  const feePlan = useMemo(
    () => resolveFeePlanPresentation({ workspace, financialOverview, details }),
    [workspace, financialOverview, details],
  );

  const currentAgreement = agreement ?? workspace?.current_agreement ?? null;
  const canAmendAgreement = isAgreementAmendmentAllowed(workspace, currentAgreement);
  const hasAgreementContext =
    feePlan.hasValidPlan ||
    feePlan.agreementState != null ||
    feePlan.agreementNumber != null ||
    currentAgreement != null;

  const actionLabel = canAmendAgreement
    ? t('admin.student360.financeWorkspace.agreementAmendment.action')
    : t('admin.student360.financeWorkspace.actions.manageAgreement');

  const handlePrimaryAction = () => {
    if (canAmendAgreement) {
      setAmendmentOpen(true);
      return;
    }
    if (!hasAgreementContext) {
      onCreateAgreement?.();
      return;
    }
    onOpenAgreements?.();
  };

  return (
    <section
      className={styles.agreementSection}
      aria-label={t('admin.student360.financeWorkspace.tabs.agreements')}
    >
      <article className={`${styles.contextCard} ${styles.agreementCard}`}>
        <header className={styles.cardHeader}>
          <div className={styles.agreementHeading}>
            <div>
              <h3 className={styles.cardTitle}>
                {t('admin.student360.financeWorkspace.tabs.agreements')}
              </h3>
              {feePlan.agreementNumber ? (
                <p className={`${styles.cardMeta} mono`} dir="auto">
                  {feePlan.agreementNumber}
                </p>
              ) : null}
            </div>
            {feePlan.agreementState ? (
              <span
                className={`${styles.statusPill} ${agreementStatusClass(feePlan.agreementUiStatus)}`}
              >
                {resolveFinanceAgreementStateLabel(t, feePlan.agreementState, {
                  hasBillableContext: feePlan.showAsInactive,
                })}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={handlePrimaryAction}
          >
            {hasAgreementContext
              ? actionLabel
              : t('admin.student360.financeWorkspace.agreementContext.actions.createFinancialAgreement')}
          </button>
        </header>

        {hasAgreementContext ? (
          <dl className={styles.agreementFacts}>
            {feePlan.feePlanName ? (
              <div className={styles.fact}>
                <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.feePlanName')}</dt>
                <dd dir="auto">{feePlan.feePlanName}</dd>
              </div>
            ) : null}
            {feePlan.netAmount != null ? (
              <div className={styles.fact}>
                <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.netAmount')}</dt>
                <dd>
                  <FinanceMoney amount={feePlan.netAmount} currency={feePlan.currency ?? undefined} />
                </dd>
              </div>
            ) : null}
            {feePlan.validFrom ? (
              <div className={styles.fact}>
                <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.validFrom')}</dt>
                <dd>{formatDate(feePlan.validFrom)}</dd>
              </div>
            ) : null}
            {feePlan.billingPartnerLabel ? (
              <div className={styles.fact}>
                <dt>{t('admin.finance.billingPartner')}</dt>
                <dd dir="auto">{feePlan.billingPartnerLabel}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className={styles.cardEmpty}>
            {t('admin.student360.financeWorkspace.agreementContext.noValidFeePlan')}
          </p>
        )}
      </article>

      <StudentFinanceAgreementAmendmentDialog
        open={amendmentOpen}
        studentId={studentId}
        agreement={currentAgreement}
        workspaceAllowed={canAmendAgreement}
        onClose={() => setAmendmentOpen(false)}
        onSuccess={() => {
          setAmendmentOpen(false);
          onRefresh?.();
        }}
      />
    </section>
  );
}
