'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { StudentYearSelectSkeleton } from '@/features/admin/students/components/student-360-loading';
import type { StudentFinanceSubTab } from '../utils/student-finance-sub-tab';

export function StudentFinanceWorkspaceHeader({
  studentId,
  academicYears,
  effectiveYearId,
  yearsLoading,
  onYearChange,
  billingPartnerId,
  subTab,
  canCollect,
  collectPaymentAllowed,
  allowInstallmentCollection = true,
  collectBlockMessage,
  shouldHideCollectButton = false,
  onOpenSchedule,
  onOpenAgreements,
  onRecordPayment,
  showChangePlan,
  showSpecialAdjustment,
  showReviewAgreement,
  reviewAgreementKind = 'review',
  onOpenChangePlan,
  onOpenSpecialAdjustment,
  onReviewAgreement,
}: {
  studentId: number;
  academicYears: { id: number; name: string }[];
  effectiveYearId: string;
  yearsLoading: boolean;
  onYearChange: (yearId: string) => void;
  billingPartnerId?: number | null;
  subTab: StudentFinanceSubTab;
  canCollect: boolean;
  collectPaymentAllowed?: boolean;
  /**
   * When false (e.g. a draft fee agreement), the collect-payment CTA is hidden
   * entirely — not just disabled — because no collection path exists at all and
   * a visible disabled/no-op button is misleading. Defaults to true.
   */
  allowInstallmentCollection?: boolean;
  collectBlockMessage?: string | null;
  shouldHideCollectButton?: boolean;
  onOpenSchedule: () => void;
  onOpenAgreements: () => void;
  onRecordPayment: () => void;
  showChangePlan?: boolean;
  showSpecialAdjustment?: boolean;
  showReviewAgreement?: boolean;
  reviewAgreementKind?: 'fix' | 'review';
  onOpenChangePlan?: () => void;
  onOpenSpecialAdjustment?: () => void;
  onReviewAgreement?: () => void;
}) {
  const t = useT();

  const showSchedule = subTab !== 'schedule' && subTab !== 'agreements';
  const showAgreement = subTab !== 'agreements';
  const showCollectButton =
    canCollect &&
    allowInstallmentCollection &&
    subTab !== 'agreements' &&
    subTab !== 'ledger' &&
    subTab !== 'historical' &&
    !shouldHideCollectButton;
  const showCollectEnabled = showCollectButton && collectPaymentAllowed !== false;
  const showCollectDisabled = showCollectButton && collectPaymentAllowed === false;
  const hasActions =
    showSchedule ||
    showAgreement ||
    showCollectEnabled ||
    showCollectDisabled ||
    !!billingPartnerId ||
    showChangePlan ||
    showSpecialAdjustment ||
    showReviewAgreement;

  return (
    <header className="student-finance-command-bar">
      <div className="student-finance-command-bar__accent" aria-hidden="true" />
      <div className="student-finance-command-bar__inner">
      <div className="student-finance-command-bar__top">
        <div className="student-finance-command-bar__identity">
          <span className="student-finance-command-bar__glyph" aria-hidden="true">
            ◈
          </span>
          <div className="student-finance-command-bar__copy">
            <h2 className="student-finance-command-bar__title">
              {t('admin.student360.financeWorkspace.pageTitle')}
            </h2>
            <p className="student-finance-command-bar__desc">
              {t('admin.student360.financeWorkspace.pageDescription')}
            </p>
          </div>
        </div>

        <div className="student-finance-command-bar__context">
          {yearsLoading && !academicYears.length ? (
            <StudentYearSelectSkeleton />
          ) : (
            <label className="student-finance-command-bar__year">
              <span className="student-finance-command-bar__year-label">
                {t('admin.student360.finance.academicYear')}
              </span>
              <span className="student-finance-command-bar__year-control">
                <span className="student-finance-command-bar__year-icon" aria-hidden="true">
                  ▦
                </span>
                <select
                  className="student-finance-command-bar__year-select"
                  value={effectiveYearId}
                  onChange={(e) => onYearChange(e.target.value)}
                  disabled={yearsLoading || !academicYears.length}
                  aria-label={t('admin.student360.finance.academicYear')}
                >
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
                <span className="student-finance-command-bar__year-chevron" aria-hidden="true">
                  ▾
                </span>
              </span>
            </label>
          )}
        </div>
      </div>

      {hasActions ? (
        <div className="student-finance-command-bar__foot">
          <div className="student-finance-command-bar__links">
            {billingPartnerId ? (
              <Link
                href={`/admin/finance/billing-accounts/${billingPartnerId}?returnTo=${encodeURIComponent(`/admin/students/${studentId}?tab=finance`)}`}
                className="student-finance-command-bar__link"
              >
                {t('admin.finance.billingAccounts.openPayerAccount')}
              </Link>
            ) : null}
          </div>

          <div className="student-finance-command-bar__actions">
            {showSchedule ? (
              <button
                type="button"
                className="student-finance-command-bar__btn student-finance-command-bar__btn--ghost"
                onClick={onOpenSchedule}
              >
                <span aria-hidden="true">▦</span>
                {t('admin.student360.financeWorkspace.openSchedule')}
              </button>
            ) : null}
            {showAgreement ? (
              <button
                type="button"
                className="student-finance-command-bar__btn student-finance-command-bar__btn--ghost"
                onClick={onOpenAgreements}
              >
                <span aria-hidden="true">✎</span>
                {t('admin.student360.financeWorkspace.actions.manageAgreement')}
              </button>
            ) : null}
            {showReviewAgreement ? (
              <button
                type="button"
                className="student-finance-command-bar__btn student-finance-command-bar__btn--ghost student-finance-command-bar__btn--review-agreement"
                onClick={onReviewAgreement}
              >
                <span aria-hidden="true">⚠</span>
                {reviewAgreementKind === 'fix'
                  ? t('admin.student360.financeWorkspace.inactiveAgreement.fixAction')
                  : t('admin.student360.financeWorkspace.inactiveAgreement.reviewAction')}
              </button>
            ) : null}
            {showChangePlan ? (
              <button
                type="button"
                className="student-finance-command-bar__btn student-finance-command-bar__btn--ghost"
                title={t('admin.student360.financeWorkspace.changePlan.replace.actionHint')}
                onClick={onOpenChangePlan}
              >
                {t('admin.student360.financeWorkspace.changePlan.replace.action')}
              </button>
            ) : null}
            {showSpecialAdjustment ? (
              <button
                type="button"
                className="student-finance-command-bar__btn student-finance-command-bar__btn--ghost"
                title={t('admin.student360.financeWorkspace.changePlan.special.actionHint')}
                onClick={onOpenSpecialAdjustment}
              >
                {t('admin.student360.financeWorkspace.changePlan.special.action')}
              </button>
            ) : null}
            {showCollectEnabled ? (
              <button
                type="button"
                className="student-finance-command-bar__btn student-finance-command-bar__btn--primary"
                onClick={onRecordPayment}
              >
                <span aria-hidden="true">+</span>
                {t('admin.student360.financeWorkspace.actions.recordPayment')}
              </button>
            ) : null}
            {showCollectDisabled ? (
              <span
                className="student-finance-collect-blocked student-finance-collect-blocked--command-bar"
                title={
                  collectBlockMessage ??
                  t('admin.student360.financeWorkspace.collectPayment.blockedMessage')
                }
              >
                <button
                  type="button"
                  className="student-finance-command-bar__btn student-finance-command-bar__btn--primary"
                  disabled
                >
                  <span aria-hidden="true">+</span>
                  {t('admin.student360.financeWorkspace.actions.recordPayment')}
                </button>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      </div>
    </header>
  );
}
