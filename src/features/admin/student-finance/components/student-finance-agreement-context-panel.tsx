'use client';

import { useMemo, useState } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
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
import {
  resolveAgreementContextCurrentTotal,
  resolveAgreementContextLineDisplay,
} from '../utils/resolve-agreement-context-line-display';
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

function formatAgreementLineDuration(
  locale: string,
  months: number | null,
  isOneTime: boolean,
): string | null {
  if (isOneTime) {
    if (locale === 'fr') return 'Une fois';
    if (locale === 'es') return 'Una vez';
    if (locale === 'en') return 'One time';
    return 'مرة واحدة';
  }
  if (months == null || months <= 0) return null;
  if (locale === 'fr') return months === 1 ? '1 mois' : `${months} mois`;
  if (locale === 'es') return months === 1 ? '1 mes' : `${months} meses`;
  if (locale === 'en') return months === 1 ? '1 month' : `${months} months`;
  if (months === 1) return 'شهر واحد';
  if (months === 2) return 'شهران';
  if (months >= 3 && months <= 10) return `${months} أشهر`;
  return `${months} شهرًا`;
}

function currentPriceLabel(locale: string): string {
  if (locale === 'fr') return 'Prix actuel';
  if (locale === 'es') return 'Precio actual';
  if (locale === 'en') return 'Current price';
  return 'السعر الحالي';
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
  const { locale } = useLocale();
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
  const currentAgreementTotal = resolveAgreementContextCurrentTotal(
    displayAgreement,
    feePlan.netAmount,
  );

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
              {currentAgreementTotal != null ? (
                <div className={styles.fact}>
                  <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.netAmount')}</dt>
                  <dd>
                    <FinanceMoney amount={currentAgreementTotal} currency={currency} />
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
                    const lineDisplay = resolveAgreementContextLineDisplay(
                      line,
                      displayAgreement?.installments ?? [],
                    );
                    const durationLabel = formatAgreementLineDuration(
                      locale,
                      lineDisplay.monthCount,
                      lineDisplay.isOneTime,
                    );
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
                          {lineDisplay.currentPrice != null ? (
                            <span className={styles.lineMetric}>
                              {currentPriceLabel(locale)}:
                              <strong>
                                <FinanceMoney amount={lineDisplay.currentPrice} currency={currency} />
                              </strong>
                            </span>
                          ) : lineDisplay.priceMin != null && lineDisplay.priceMax != null ? (
                            <span className={styles.lineMetric}>
                              {currentPriceLabel(locale)}:
                              <strong>
                                <FinanceMoney amount={lineDisplay.priceMin} currency={currency} />
                                {' — '}
                                <FinanceMoney amount={lineDisplay.priceMax} currency={currency} />
                              </strong>
                            </span>
                          ) : null}
                          {durationLabel ? (
                            <span className={styles.lineMetric}>
                              <strong>{durationLabel}</strong>
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
                          {lineDisplay.total != null ? (
                            <span className={`${styles.lineMetric} ${styles.lineNet}`}>
                              {t('admin.student360.financialAgreement.columns.net')}:
                              <strong>
                                <FinanceMoney amount={lineDisplay.total} currency={currency} />
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
