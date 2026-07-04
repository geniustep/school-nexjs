'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import type { FinanceReviewBillingPartnerPresentation } from '../types/finance-review';
import { shouldShowFinanceReviewCollectionsLink } from '../utils/resolve-finance-review-collections-link';
import { buildStudentFinanceWorkspaceHref } from '../utils/student-finance-sub-tab';

export function FinanceReviewBillingPartnerSection({
  studentId,
  mismatch,
}: {
  studentId: number;
  mismatch: FinanceReviewBillingPartnerPresentation;
}) {
  const t = useT();
  const showCollectionsLink = shouldShowFinanceReviewCollectionsLink(mismatch);
  const collectionsHref = buildStudentFinanceWorkspaceHref(studentId, 'collections');

  return (
    <div className="student-finance-agreement-context__alert student-finance-finance-review" role="alert">
      <h4 className="student-finance-finance-review__title">
        {t('admin.student360.financeWorkspace.financeReview.title')}
      </h4>
      <p>{t('admin.student360.financeWorkspace.financeReview.billingPartnerMismatchReason')}</p>
      <dl className="student-finance-finance-review__partners detail-list compact">
        <div>
          <dt>{t('admin.student360.financeWorkspace.financeReview.agreementPartnerLabel')}</dt>
          <dd dir="auto">{mismatch.agreementPartnerName ?? t('common.dash')}</dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.financeReview.profilePartnerLabel')}</dt>
          <dd dir="auto">{mismatch.profilePartnerName ?? t('common.dash')}</dd>
        </div>
      </dl>
      {!mismatch.resolutionAvailable && showCollectionsLink ? (
        <>
          <p className="tiny muted">
            {t('admin.student360.financeWorkspace.financeReview.confirmedOperationsBlockExplanation')}
          </p>
          <Link href={collectionsHref} className="btn btn--ghost btn--sm">
            {t('admin.student360.financeWorkspace.financeReview.viewCollectionsAndReceipts')}
          </Link>
        </>
      ) : !mismatch.resolutionAvailable && mismatch.resolutionBlockReason ? (
        <p className="tiny muted">{mismatch.resolutionBlockReason}</p>
      ) : null}
      {!mismatch.resolutionAvailable && !mismatch.resolutionBlockReason && mismatch.resolutionMessage ? (
        <p className="tiny muted">{mismatch.resolutionMessage}</p>
      ) : null}
    </div>
  );
}
