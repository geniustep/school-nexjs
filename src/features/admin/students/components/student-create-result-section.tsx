'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { RegistrationPostCreateCollectionEntry } from './registration-post-create-collection-entry';
import { StudentCreateStyledSection } from './student-create-section-header';

export interface StudentCreateResultModel {
  studentId: number;
  studentCode?: string | null;
  financeAttached: boolean;
  financeActivation?: 'draft' | 'activate';
  agreementState?: string | null;
  billingUnresolved?: boolean;
  collectionAllowed?: boolean | null;
  billingPartnerId?: number | null;
}

export function StudentCreateResultSection({
  result,
  onOpenStudent360,
  onCreateAnother,
  onBackToList,
}: {
  result: StudentCreateResultModel;
  onOpenStudent360: () => void;
  onCreateAnother: () => void;
  onBackToList: () => void;
}) {
  const t = useT();
  const reference =
    result.studentCode?.trim() ||
    (result.studentId > 0 ? String(result.studentId) : null);

  return (
    <StudentCreateStyledSection
      icon="review"
      title={t('admin.student360.create.result.title')}
      lead={t('admin.student360.create.result.lead')}
      className="student-create-result"
    >
      <div className="student-create-result__panel" role="status" data-testid="student-create-result">
        <p className="student-create-result__success">
          {t('admin.student360.create.result.success')}
        </p>
        {reference ? (
          <dl className="student-create-review-stats">
            <div className="student-create-review-stat">
              <dt>{t('admin.student360.create.result.studentReference')}</dt>
              <dd className="mono" dir="ltr">
                {reference}
              </dd>
            </div>
          </dl>
        ) : null}
        {result.financeAttached ? (
          <p className="student-create-form__notice" role="status">
            {result.financeActivation === 'activate'
              ? t('admin.student360.create.result.financeActivated')
              : t('admin.student360.create.result.financeDraft')}
          </p>
        ) : (
          <p className="student-create-form__notice" role="status">
            {t('admin.student360.create.result.financeSkipped')}
          </p>
        )}
        {result.billingUnresolved ? (
          <p className="student-create-review__alert" role="alert">
            {t('admin.student360.create.billingResponsibility.unresolvedWarning')}
          </p>
        ) : null}
      </div>

      <RegistrationPostCreateCollectionEntry
        succeededStudentIds={[result.studentId]}
        billingUnresolved={Boolean(result.billingUnresolved)}
        collectionAllowed={result.collectionAllowed ?? null}
        billingPartnerIdHint={result.billingPartnerId ?? null}
      />

      <div className="student-create-form__actions student-create-result__actions">
        <button
          type="button"
          className="btn btn--primary"
          data-testid="student-create-open-360"
          onClick={onOpenStudent360}
        >
          {t('admin.student360.create.result.openStudent360')}
        </button>
        <Link
          href={`/admin/students/${result.studentId}?tab=finance`}
          className="btn btn--secondary"
          data-testid="student-create-open-finance"
        >
          {t('admin.student360.registrationCollection.openFinance')}
        </Link>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="student-create-another"
          onClick={onCreateAnother}
        >
          {t('admin.student360.create.result.createAnother')}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          data-testid="student-create-back-list"
          onClick={onBackToList}
        >
          {t('admin.student360.create.result.backToList')}
        </button>
      </div>
    </StudentCreateStyledSection>
  );
}
