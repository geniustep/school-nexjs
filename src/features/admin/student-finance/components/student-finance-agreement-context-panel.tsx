'use client';

import { useMemo, useState } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type { StudentDetailsData } from '@/types/student-360';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type {
  FinancialAgreement,
  FinancialAgreementLine,
  StudentFinanceWorkspace,
} from '../types';
import { resolveFeePlanPresentation } from '../utils/resolve-fee-plan-presentation';
import { resolveFinanceAgreementStateLabel } from '../utils/reference-labels';
import { isAgreementAmendmentAllowed } from '../utils/resolve-agreement-amendment-action';
import { StudentFinanceAgreementAmendmentDialog } from './student-finance-agreement-amendment-dialog';
import styles from './student-finance-overview-panel.module.css';

const HISTORICAL_ONLY_LINE_STATES = new Set([
  'cancelled_historical_only',
  'completed_historical_only',
  'historical_only',
]);

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

function shouldShowAgreementLine(line: FinancialAgreementLine): boolean {
  if (line.is_selected === false) return false;
  const lifecycle =
    typeof line.operational_state === 'string'
      ? line.operational_state.trim().toLowerCase()
      : '';
  return !HISTORICAL_ONLY_LINE_STATES.has(lifecycle);
}

function agreementLineLabel(line: FinancialAgreementLine): string | null {
  const candidates = [line.service_name, line.service?.name];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

function agreementLineQuantity(line: FinancialAgreementLine): number | null {
  const quantity = line.quantity ?? line.periods_count ?? line.schedule_period_count;
  return typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0
    ? quantity
    : null;
}

function agreementLineTotal(line: FinancialAgreementLine): number | null {
  const amount = line.net_amount ?? line.schedule_total ?? line.gross_amount;
  return typeof amount === 'number' && Number.isFinite(amount) ? amount : null;
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
  const agreementLines = useMemo(
    () => (currentAgreement?.lines ?? []).filter(shouldShowAgreementLine),
    [currentAgreement],
  );
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
          <>
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

            {agreementLines.length ? (
              <section
                className={styles.servicesSummary}
                aria-label={t('admin.student360.familyFinance.children.services')}
              >
                <div className={styles.servicesHeader}>
                  <h4>{t('admin.student360.familyFinance.children.services')}</h4>
                  <span className={styles.servicesCount}>{agreementLines.length}</span>
                </div>
                <div className={styles.servicesList}>
                  {agreementLines.map((line, index) => {
                    const label = agreementLineLabel(line) ?? t('common.dash');
                    const quantity = agreementLineQuantity(line);
                    const total = agreementLineTotal(line);
                    const unitPrice =
                      typeof line.unit_price === 'number' && Number.isFinite(line.unit_price)
                        ? line.unit_price
                        : null;
                    const showTotal =
                      total != null &&
                      (unitPrice == null || quantity == null || quantity > 1 || total !== unitPrice);

                    return (
                      <div
                        key={line.id ?? `${label}-${index}`}
                        className={styles.serviceLine}
                      >
                        <strong className={styles.serviceName} dir="auto">
                          {label}
                        </strong>
                        <div className={styles.servicePricing}>
                          {unitPrice != null ? (
                            <span className={styles.serviceUnitPrice}>
                              <FinanceMoney
                                amount={unitPrice}
                                currency={feePlan.currency ?? undefined}
                              />
                            </span>
                          ) : null}
                          {quantity != null && quantity > 1 ? (
                            <span className={styles.serviceQuantity}>× {quantity}</span>
                          ) : null}
                          {showTotal ? (
                            <strong className={styles.serviceTotal}>
                              <FinanceMoney
                                amount={total}
                                currency={feePlan.currency ?? undefined}
                              />
                            </strong>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
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
