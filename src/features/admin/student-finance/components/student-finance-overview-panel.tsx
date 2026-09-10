'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { StudentSectionSkeleton } from '@/features/admin/students/components/student-360-loading';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale } from '@/features/i18n/locale-context';
import { refName } from '@/lib/utils/finance';
import type { StudentFinanceCapabilities } from '@/types/student-finance';
import type { StudentFinancePanelProps } from './student-finance-panel-props';
import { BillingAuthorityChangeDialog } from './billing-authority-change-dialog';
import { useStudentFamilyFinanceSummary } from '../hooks/use-student-family-finance';
import { canChangeBillingAuthority } from '../utils/resolve-billing-authority-change-visibility';
import { resolveBillingPartyLabel } from '../utils/resolve-student-finance-overview';
import styles from './student-finance-overview-panel.module.css';

/**
 * The finance overview is intentionally contextual rather than transactional.
 * Agreement details live in StudentFinanceAgreementContextPanel; installment
 * tables and payment entry do not belong in the overview.
 */
export function StudentFinanceOverviewPanel({
  studentId,
  details,
  capabilities,
  workspace,
  financialOverview,
  financialOverviewLoading,
  financialOverviewError,
  onReloadFinancialOverview,
  onRefresh,
  financeRefreshSignal = 0,
}: StudentFinancePanelProps) {
  const { t } = useLocale();
  const { formatDate } = useFormat();
  const [billingAuthorityDialogOpen, setBillingAuthorityDialogOpen] = useState(false);

  const financeCaps = (financialOverview?.capabilities ??
    workspace?.capabilities) as StudentFinanceCapabilities | undefined;
  const canChangeBillingAuthorityAction = canChangeBillingAuthority(capabilities, financeCaps);

  const billingPartner =
    workspace?.finance_profile?.billing_partner ??
    workspace?.billing_partner ??
    workspace?.current_agreement?.billing_partner ??
    null;
  const billingPartnerName = billingPartner ? refName(billingPartner) : null;
  const billingLabel =
    billingPartnerName ||
    resolveBillingPartyLabel({
      billingProfile: financialOverview?.billing_profile,
      billingPartyType: financialOverview?.billing_profile?.billing_party_type,
      t,
    });
  const resolvedBillingLabel = billingLabel || t('common.dash');

  const familyState = useStudentFamilyFinanceSummary(studentId, true, financeRefreshSignal);
  const family = familyState.data;
  const familyStudentCount = family?.student_count ?? family?.children.length ?? 0;
  const showFamily = family != null && familyStudentCount > 1;
  const familyAccountId = family?.family_id ?? family?.billing_partner_id ?? null;
  const familyNames = useMemo(
    () =>
      (family?.children ?? [])
        .map((child) => child.student_name?.trim() ?? '')
        .filter(Boolean)
        .slice(0, 4),
    [family?.children],
  );
  const hiddenFamilyNames = Math.max(0, familyStudentCount - familyNames.length);

  if (financialOverviewLoading && !financialOverview) {
    return <StudentSectionSkeleton rows={2} />;
  }

  if (financialOverviewError && !financialOverview) {
    return (
      <div className="student-finance-summary-error" role="alert">
        <p>{t('admin.student360.financeOps.summaryLoadError')}</p>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onReloadFinancialOverview}
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.overview}>
      <section
        className={styles.contextGrid}
        aria-label={t('admin.student360.financeWorkspace.billingPartyTitle')}
      >
        <article className={styles.contextCard}>
          <header className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                {t('admin.student360.financeWorkspace.billingPartyTitle')}
              </h3>
              {financialOverview?.billing_profile?.effective_from ? (
                <p className={styles.cardMeta}>
                  {t('admin.student360.financeWorkspace.billingEffectiveFrom')}:{' '}
                  {formatDate(financialOverview.billing_profile.effective_from)}
                </p>
              ) : null}
            </div>
            {canChangeBillingAuthorityAction ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setBillingAuthorityDialogOpen(true)}
              >
                {t('admin.student360.financeWorkspace.billingAuthorityChange.action')}
              </button>
            ) : null}
          </header>
          <p className={styles.responsibleName} dir="auto">
            {resolvedBillingLabel}
          </p>
        </article>

        {showFamily && family ? (
          <article className={styles.contextCard}>
            <header className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>{t('admin.student360.familyFinance.title')}</h3>
                <p className={styles.cardMeta}>
                  {t('admin.student360.familyFinance.childrenCount')}: {familyStudentCount}
                </p>
              </div>
              {familyAccountId != null ? (
                <Link
                  href={`/admin/finance/billing-accounts/${familyAccountId}?returnTo=${encodeURIComponent(`/admin/students/${studentId}?tab=finance`)}`}
                  className="btn btn--ghost btn--sm"
                >
                  {t('admin.student360.familyFinance.openBillingAccount')}
                </Link>
              ) : null}
            </header>
            {familyNames.length ? (
              <div className={styles.familyNames}>
                {familyNames.map((name, index) => (
                  <span key={`${name}-${index}`} className={styles.familyName} dir="auto">
                    {name}
                  </span>
                ))}
                {hiddenFamilyNames > 0 ? (
                  <span className={styles.familyMore}>+{hiddenFamilyNames}</span>
                ) : null}
              </div>
            ) : null}
          </article>
        ) : null}
      </section>

      <BillingAuthorityChangeDialog
        open={billingAuthorityDialogOpen}
        studentId={studentId}
        details={details}
        currentAuthorityName={resolvedBillingLabel}
        onClose={() => setBillingAuthorityDialogOpen(false)}
        onSuccess={() => {
          setBillingAuthorityDialogOpen(false);
          onReloadFinancialOverview();
          onRefresh();
        }}
      />
    </div>
  );
}
