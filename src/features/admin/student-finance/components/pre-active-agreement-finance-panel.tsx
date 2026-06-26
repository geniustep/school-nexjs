'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import {
  buildStudentFinanceAgreementsHref,
  type PreActiveFinancialAgreementRef,
} from '../utils/resolve-pre-active-financial-agreement';

export function PreActiveAgreementFinancePanel({
  studentId,
  agreement,
  onReviewAgreement,
}: {
  studentId: number;
  agreement: PreActiveFinancialAgreementRef;
  onReviewAgreement?: () => void;
}) {
  const t = useT();
  const agreementsHref = buildStudentFinanceAgreementsHref(studentId);

  return (
    <section className="student-finance-section student-finance-pre-active-agreement card">
      <p className="student-finance-pre-active-agreement__eyebrow">
        {t('admin.student360.finance.assignPlan.preActive.badge')}
      </p>
      <h3 className="student-finance-pre-active-agreement__title">
        {t('admin.student360.finance.assignPlan.preActive.title')}
      </h3>
      <p className="student-finance-pre-active-agreement__desc">
        {t('admin.student360.finance.assignPlan.preActive.description')}
      </p>
      {agreement.number ? (
        <p className="student-finance-pre-active-agreement__ref mono">{agreement.number}</p>
      ) : null}
      <div className="student-finance-pre-active-agreement__actions">
        {onReviewAgreement ? (
          <button type="button" className="btn btn--primary" onClick={onReviewAgreement}>
            {t('admin.student360.finance.assignPlan.preActive.reviewAction')}
          </button>
        ) : (
          <Link href={agreementsHref} className="btn btn--primary">
            {t('admin.student360.finance.assignPlan.preActive.reviewAction')}
          </Link>
        )}
      </div>
    </section>
  );
}
