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
  onOpenSchedule,
  onOpenAgreements,
  onRecordPayment,
  showReplaceIfUnpaid,
  showSocialDiscount,
  onOpenReplacePlan,
  onOpenSocialDiscount,
}: {
  studentId: number;
  academicYears: { id: number; name: string }[];
  effectiveYearId: string;
  yearsLoading: boolean;
  onYearChange: (yearId: string) => void;
  billingPartnerId?: number | null;
  subTab: StudentFinanceSubTab;
  canCollect: boolean;
  onOpenSchedule: () => void;
  onOpenAgreements: () => void;
  onRecordPayment: () => void;
  showReplaceIfUnpaid?: boolean;
  showSocialDiscount?: boolean;
  onOpenReplacePlan?: () => void;
  onOpenSocialDiscount?: () => void;
}) {
  const t = useT();

  const showSchedule = subTab !== 'schedule' && subTab !== 'agreements';
  const showAgreement = subTab !== 'agreements';
  const showCollect = canCollect && subTab !== 'agreements' && subTab !== 'ledger';
  const hasActions =
    showSchedule ||
    showAgreement ||
    showCollect ||
    !!billingPartnerId ||
    showReplaceIfUnpaid ||
    showSocialDiscount;

  return (
    <header className="student-finance-command-bar">
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
            {showReplaceIfUnpaid ? (
              <button
                type="button"
                className="student-finance-command-bar__btn student-finance-command-bar__btn--ghost"
                onClick={onOpenReplacePlan}
              >
                {t('admin.student360.financeWorkspace.changePlan.replace.action')}
              </button>
            ) : null}
            {showSocialDiscount ? (
              <button
                type="button"
                className="student-finance-command-bar__btn student-finance-command-bar__btn--ghost"
                onClick={onOpenSocialDiscount}
              >
                {t('admin.student360.financeWorkspace.changePlan.social.action')}
              </button>
            ) : null}
            {showCollect ? (
              <button
                type="button"
                className="student-finance-command-bar__btn student-finance-command-bar__btn--primary"
                onClick={onRecordPayment}
              >
                <span aria-hidden="true">+</span>
                {t('admin.student360.financeWorkspace.actions.recordPayment')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
