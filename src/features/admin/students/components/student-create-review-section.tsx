'use client';

import { useLocale, useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { buildFullNamePreview, hasStudentCreateIdentifier } from '../utils/student-profile';
import { formatFinanceCurrency } from '../utils/student-finance-format';
import { buildEnrollmentFinanceReviewModel, enrollmentFinancePreviewStatus } from '../utils/enrollment-finance-review';
import { formatCustomizationReason } from '../utils/student-enrollment-finance';
import { selectedFinancePeriods } from '../utils/student-enrollment-finance';
import type {
  EnrollmentPlanPreviewResult,
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
  preview,
  previewLoading,
  previewError,
  financeBlocked,
  massarDuplicate = false,
}: {
  profileState: StudentProfileFormState;
  billingState: StudentCreateBillingFormState;
  suggest: FeePlanSuggestResult | null;
  financeState: StudentCreateFinanceFormState;
  preview: EnrollmentPlanPreviewResult | null;
  previewLoading?: boolean;
  previewError?: string | null;
  financeBlocked: boolean;
  massarDuplicate?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  const fullName = buildFullNamePreview(profileState.firstName, profileState.lastName);
  const identifierMissing = !hasStudentCreateIdentifier(profileState);
  const formatReason = (reason: string) => formatCustomizationReason(reason, t);
  const financeReview =
    suggest != null ? buildEnrollmentFinanceReviewModel(suggest, financeState, preview, formatReason) : null;
  const previewStatus = enrollmentFinancePreviewStatus({
    customizePlan: financeState.customizePlan,
    previewLoading: previewLoading ?? false,
    previewError: previewError ?? null,
    preview,
  });
  const showPreviewTotals = financeReview?.customized
    ? previewStatus === 'ready'
    : financeReview?.finalTotal != null;
  const selectedPeriods = suggest ? selectedFinancePeriods(suggest, financeState) : [];
  const firstDue = selectedPeriods[0]?.due_date;
  const lastDue = selectedPeriods[selectedPeriods.length - 1]?.due_date;

  return (
    <section className="student-create-form__section student-create-review">
      <h2 className="student-create-form__section-title">{t('admin.student360.create.review.title')}</h2>

      {identifierMissing ? (
        <p className="student-create-finance-preview__error" role="alert">
          {t('admin.student360.create.review.missingStudentIdentifier')}
        </p>
      ) : null}
      {!identifierMissing && !profileState.academicYearId.trim() && suggest ? (
        <p className="student-create-finance-preview__error" role="alert">
          {t('admin.student360.create.review.missingAcademicYearForFinance')}
        </p>
      ) : null}
      {massarDuplicate ? (
        <p className="student-create-finance-preview__error" role="alert">
          {t('admin.student360.create.review.duplicateMassar')}
        </p>
      ) : null}

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
      ) : suggest && financeReview ? (
        <div className="student-create-review__finance-block">
          <h3 className="student-create-review__subtitle">
            {t('admin.student360.create.review.financeSectionTitle')}
          </h3>
          {financeState.customizePlan && previewStatus !== 'ready' && previewStatus !== 'not_needed' ? (
            <p className="student-create-finance-preview__error" role="alert">
              {previewError?.trim() || t('admin.student360.create.review.reviewFinanceBeforeSave')}
            </p>
          ) : null}
          <dl className="student-create-review__list student-create-review__finance">
            <div className="student-create-review__row">
              <dt>{t('admin.student360.create.review.selectedPlan')}</dt>
              <dd dir="auto">
                {financeReview.planName}
                <span className="mono tiny muted"> #{financeReview.planId}</span>
              </dd>
            </div>

            <div className="student-create-review__row">
              <dt>{t('admin.student360.create.review.customization.enabled')}</dt>
              <dd>
                {financeReview.customized
                  ? t('common.yes')
                  : t('admin.student360.create.review.customization.disabled')}
              </dd>
            </div>

            {financeReview.customized ? (
              <>
                {financeReview.customizationReason ? (
                  <div className="student-create-review__row">
                    <dt>{t('admin.student360.create.finance.customizationReason')}</dt>
                    <dd>
                      {formatCustomizationReason(financeReview.customizationReason, t)}
                    </dd>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="student-create-review__row">
                <dd className="tiny muted">{t('admin.student360.create.review.customization.asIs')}</dd>
              </div>
            )}

            {showPreviewTotals && financeReview.originalTotal != null ? (
              <div className="student-create-review__row">
                <dt>{t('admin.student360.create.finance.preview.originalTotal')}</dt>
                <dd className="mono">
                  {formatFinanceCurrency(financeReview.originalTotal, suggest.currency, locale)}
                </dd>
              </div>
            ) : null}
            {showPreviewTotals && financeReview.discountTotal != null ? (
              <div className="student-create-review__row">
                <dt>{t('admin.student360.create.finance.preview.discountTotal')}</dt>
                <dd className="mono">
                  {formatFinanceCurrency(financeReview.discountTotal, suggest.currency, locale)}
                </dd>
              </div>
            ) : null}
            {showPreviewTotals && financeReview.finalTotal != null ? (
              <div className="student-create-review__row student-create-review__row--emphasis">
                <dt>
                  {financeReview.customized
                    ? t('admin.student360.create.finance.preview.finalTotal')
                    : t('admin.student360.create.review.totalDue')}
                </dt>
                <dd className="mono">
                  {formatFinanceCurrency(financeReview.finalTotal, suggest.currency, locale)}
                </dd>
              </div>
            ) : null}
            {showPreviewTotals && financeReview.monthlyInstallment != null ? (
              <div className="student-create-review__row">
                <dt>
                  {financeReview.customized
                    ? t('admin.student360.create.finance.preview.monthlyAfterCustomization')
                    : t('admin.student360.create.review.expectedMonthlyInstallment')}
                </dt>
                <dd className="mono">
                  {formatFinanceCurrency(financeReview.monthlyInstallment, suggest.currency, locale)}
                </dd>
              </div>
            ) : null}

            {!financeReview.customized
              ? financeReview.summaryRows.map((row) => (
                  <div key={row.key} className="student-create-review__row">
                    <dt>{t(`admin.student360.create.finance.summary.${row.key}`)}</dt>
                    <dd className="mono">
                      {formatFinanceCurrency(row.value, suggest.currency, locale)}
                    </dd>
                  </div>
                ))
              : null}

            {financeReview.customized && financeReview.customizationItems.length > 0 ? (
              <div className="student-create-review__customization">
                <dt className="student-create-review__customization-title">
                  {t('admin.student360.create.review.customization.itemsTitle')}
                </dt>
                <ul className="student-create-review__customization-list">
                  {financeReview.customizationItems.map((item, index) => (
                    <li key={`${item.kind}-${index}`}>
                      {item.kind === 'plan_discount'
                        ? t('admin.student360.create.review.customization.planDiscount', {
                            detail: item.label,
                          })
                        : item.kind === 'line_discount'
                          ? t('admin.student360.create.review.customization.lineDiscount', {
                              detail: item.label,
                            })
                          : item.kind === 'one_time_excluded'
                            ? t('admin.student360.create.review.customization.oneTimeExcluded', {
                                name: item.label,
                              })
                            : item.kind === 'one_time_modified'
                              ? t('admin.student360.create.review.customization.oneTimeModified', {
                                  detail: item.label,
                                })
                              : item.kind === 'period_excluded'
                                ? t('admin.student360.create.review.customization.periodExcluded', {
                                    name: item.label,
                                  })
                                : t('admin.student360.create.review.customization.periodModified', {
                                    detail: item.label,
                                  })}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

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
          </dl>
        </div>
      ) : (
        <p className="tiny muted">{t('admin.student360.create.finance.waitingEnrollment')}</p>
      )}
    </section>
  );
}
