'use client';

import { useMemo, useState } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
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
import styles from './student-finance-agreement-context-panel.module.css';

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
  const agreementDetailState = useAdminResource<FinancialAgreement>(
    currentAgreement?.id ? endpoints.admin.financialAgreement(currentAgreement.id) : null,
  );
  const displayAgreement = agreementDetailState.data ?? currentAgreement;

  const agreementLines = useMemo(
    () => (displayAgreement?.lines ?? []).filter(shouldShowAgreementLine),
    [displayAgreement],
  );
  const canAmendAgreement = isAgreementAmendmentAllowed(workspace, displayAgreement);
  const hasAgreementContext =
    feePlan.hasValidPlan ||
    feePlan.agreementState != null ||
    feePlan.agreementNumber != null ||
    displayAgreement != null;

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

  const currency = displayAgreement?.currency?.name ?? feePlan.currency ?? undefined;

  return (
    <section
      className={styles.section}
      aria-label={t('admin.student360.financeWorkspace.tabs.agreements')}
    >
      <article className={styles.card}>
        <header className={styles.header}>
          <div className={styles.identity}>
            <div className={styles.titleBlock}>
              <h3 className={styles.title}>
                {t('admin.student360.financeWorkspace.tabs.agreements')}
              </h3>
              {feePlan.agreementNumber ? (
                <p className={`${styles.reference} mono`} dir="auto">
                  {feePlan.agreementNumber}
                </p>
              ) : null}
            </div>
            {feePlan.agreementState ? (
              <span
                className={`${styles.status} ${agreementStatusClass(feePlan.agreementUiStatus)}`}
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
            <dl className={styles.facts}>
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
                    <FinanceMoney amount={feePlan.netAmount} currency={currency} />
                  </dd>
                </div>
              ) : null}
              {feePlan.billingPartnerLabel ? (
                <div className={styles.fact}>
                  <dt>{t('admin.finance.billingPartner')}</dt>
                  <dd dir="auto">{feePlan.billingPartnerLabel}</dd>
                </div>
              ) : null}
              {feePlan.validFrom ? (
                <div className={styles.fact}>
                  <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.validFrom')}</dt>
                  <dd>{formatDate(feePlan.validFrom)}</dd>
                </div>
              ) : null}
            </dl>

            {agreementDetailState.initialLoading && !agreementDetailState.data ? (
              <p className={styles.loading}>{t('common.loading')}</p>
            ) : agreementLines.length ? (
              <section
                className={styles.lines}
                aria-label={t('admin.student360.familyFinance.children.services')}
              >
                <header className={styles.linesHeader}>
                  <h4 className={styles.linesTitle}>
                    {t('admin.student360.familyFinance.children.services')}
                  </h4>
                  <span className={styles.linesCount}>{agreementLines.length}</span>
                </header>
                <div className={styles.linesList}>
                  {agreementLines.map((line, index) => {
                    const label = agreementLineLabel(line) ?? t('common.dash');
                    const quantity = agreementLineQuantity(line);
                    const total = agreementLineTotal(line);
                    const unitPrice =
                      typeof line.unit_price === 'number' && Number.isFinite(line.unit_price)
                        ? line.unit_price
                        : null;
                    const discount =
                      typeof line.discount_amount === 'number' && line.discount_amount > 0
                        ? line.discount_amount
                        : null;
                    const periodStart = line.period_start ?? line.service_from ?? null;
                    const periodEnd = line.period_end ?? line.service_until ?? null;

                    return (
                      <div key={line.id ?? `${label}-${index}`} className={styles.line}>
                        <div className={styles.lineIdentity}>
                          <strong className={styles.lineName} dir="auto">
                            {label}
                          </strong>
                          {periodStart || periodEnd ? (
                            <span className={styles.linePeriod}>
                              {periodStart ? formatDate(periodStart) : t('common.dash')} —{' '}
                              {periodEnd ? formatDate(periodEnd) : t('common.dash')}
                            </span>
                          ) : null}
                        </div>

                        <div className={styles.linePricing}>
                          {unitPrice != null ? (
                            <span className={styles.lineMetric}>
                              {t('admin.student360.financialAgreement.columns.unitPrice')}:
                              <strong>
                                <FinanceMoney amount={unitPrice} currency={currency} />
                              </strong>
                            </span>
                          ) : null}
                          {quantity != null ? (
                            <span className={styles.lineMetric}>
                              {t('admin.student360.financialAgreement.columns.quantity')}:
                              <strong>{quantity}</strong>
                            </span>
                          ) : null}
                          {discount != null ? (
                            <span className={styles.lineMetric}>
                              {t('admin.student360.financialAgreement.columns.discount')}:
                              <strong>
                                <FinanceMoney amount={discount} currency={currency} />
                              </strong>
                            </span>
                          ) : null}
                          {total != null ? (
                            <span className={`${styles.lineMetric} ${styles.lineNet}`}>
                              {t('admin.student360.financialAgreement.columns.net')}:
                              <strong>
                                <FinanceMoney amount={total} currency={currency} />
                              </strong>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <p className={styles.empty}>
                {t('admin.student360.financeWorkspace.agreementContext.noValidFeePlan')}
              </p>
            )}
          </>
        ) : (
          <p className={styles.empty}>
            {t('admin.student360.financeWorkspace.agreementContext.noValidFeePlan')}
          </p>
        )}
      </article>

      <StudentFinanceAgreementAmendmentDialog
        open={amendmentOpen}
        studentId={studentId}
        agreement={displayAgreement}
        workspaceAllowed={canAmendAgreement}
        onClose={() => setAmendmentOpen(false)}
        onSuccess={() => {
          setAmendmentOpen(false);
          agreementDetailState.reload();
          onRefresh?.();
        }}
      />
    </section>
  );
}
