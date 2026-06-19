'use client';

import { useLocale, useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { buildFullNamePreview } from '../utils/student-profile';
import { formatFinanceCurrency } from '../utils/student-finance-format';
import { selectedFinancePeriods } from '../utils/student-enrollment-finance';
import type {
  FeePlanSuggestResult,
  StudentCreateBillingFormState,
  StudentCreateFinanceFormState,
} from '@/types/student-enrollment-finance';
import type { StudentProfileFormState } from '../utils/student-profile';

function billingPartnerLabel(
  t: (key: string) => string,
  type: StudentCreateBillingFormState['billingPartnerType'],
): string {
  if (type === 'student') return t('admin.finance.partnerStudent');
  if (type === 'other') return t('admin.student360.create.billing.partnerOther');
  return t('admin.finance.partnerGuardian');
}

export function StudentCreateReviewSection({
  profileState,
  billingState,
  suggest,
  financeState,
  financeBlocked,
}: {
  profileState: StudentProfileFormState;
  billingState: StudentCreateBillingFormState;
  suggest: FeePlanSuggestResult | null;
  financeState: StudentCreateFinanceFormState;
  financeBlocked: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  const fullName = buildFullNamePreview(profileState.firstName, profileState.lastName);
  const selectedPeriods = suggest ? selectedFinancePeriods(suggest, financeState) : [];
  const firstDue = selectedPeriods[0]?.due_date;
  const lastDue = selectedPeriods[selectedPeriods.length - 1]?.due_date;

  return (
    <section className="student-create-form__section student-create-review">
      <h2 className="student-create-form__section-title">{t('admin.student360.create.review.title')}</h2>

      <dl className="student-create-review__list">
        <div className="student-create-review__row">
          <dt>{t('admin.student360.create.review.student')}</dt>
          <dd dir="auto">{fullName || t('common.dash')}</dd>
        </div>
        <div className="student-create-review__row">
          <dt>{t('admin.student360.create.review.enrollmentDate')}</dt>
          <dd>{formatDate(profileState.actualJoinDate) || t('common.dash')}</dd>
        </div>
        <div className="student-create-review__row">
          <dt>{t('admin.student360.create.review.billingPartner')}</dt>
          <dd>{billingPartnerLabel(t, billingState.billingPartnerType)}</dd>
        </div>
      </dl>

      {financeBlocked ? (
        <div className="student-create-fee-plan__alert" role="alert">
          <p>{t('admin.student360.create.finance.noPlanMessage')}</p>
        </div>
      ) : suggest ? (
        <dl className="student-create-review__list student-create-review__finance">
          <div className="student-create-review__row">
            <dt>{t('admin.student360.create.review.financePlan')}</dt>
            <dd dir="auto">{suggest.fee_plan_name}</dd>
          </div>
          <div className="student-create-review__row">
            <dt>{t('admin.student360.create.review.planType')}</dt>
            <dd>
              {financeState.customizePlan
                ? t('admin.student360.create.review.planCustomized')
                : t('admin.student360.create.review.planOriginal')}
            </dd>
          </div>
          <div className="student-create-review__row">
            <dt>{t('admin.student360.create.review.installmentCount')}</dt>
            <dd>{selectedPeriods.length}</dd>
          </div>
          {firstDue ? (
            <div className="student-create-review__row">
              <dt>{t('admin.student360.create.review.firstInstallment')}</dt>
              <dd>{formatDate(firstDue)}</dd>
            </div>
          ) : null}
          {lastDue ? (
            <div className="student-create-review__row">
              <dt>{t('admin.student360.create.review.lastInstallment')}</dt>
              <dd>{formatDate(lastDue)}</dd>
            </div>
          ) : null}
          {suggest.total_due != null ? (
            <div className="student-create-review__row">
              <dt>{t('admin.student360.create.review.totalDue')}</dt>
              <dd>{formatFinanceCurrency(suggest.total_due, suggest.currency, locale)}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="tiny muted">{t('admin.student360.create.finance.waitingEnrollment')}</p>
      )}
    </section>
  );
}
