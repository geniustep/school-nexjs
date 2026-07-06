'use client';

import { useLocale, useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { buildFullNamePreview, hasStudentMassarCode } from '../utils/student-profile';
import { formatFinanceCurrency } from '../utils/student-finance-format';
import { buildEnrollmentFinanceReviewModel, enrollmentFinancePreviewStatus } from '../utils/enrollment-finance-review';
import { formatCustomizationReason, getFeePlanSuggestPendingReason, resolveFeePlanSuggestEmptyMessage, selectedFinancePeriods } from '../utils/student-enrollment-finance';
import { resolveBillingResponsibilitySelectionLabel } from '../utils/student-create-billing-responsibility';
import type {
  EnrollmentPlanPreviewResult,
  FeePlanSuggestResult,
  StudentCreateBillingFormState,
  StudentCreateFinanceFormState,
} from '@/types/student-enrollment-finance';
import type { StudentProfileFormState } from '../utils/student-profile';
import { StudentCreateStyledSection } from './student-create-section-header';

function billingResponsibilityReviewLabel(
  t: (key: string) => string,
  billingState: StudentCreateBillingFormState,
): string {
  const base = resolveBillingResponsibilitySelectionLabel(billingState.responsibilitySelection, t);
  if (billingState.responsibilitySelection === 'student' && billingState.studentBillingReason.trim()) {
    return `${base} — ${billingState.studentBillingReason.trim()}`;
  }
  return base;
}

function filterFinanceSummaryRows(
  rows: Array<{ key: string; value: number }>,
  options: { hideExpectedTotal: boolean; hideMonthlyInstallment: boolean },
) {
  return rows.filter((row) => {
    if (options.hideExpectedTotal && row.key === 'expected_total') return false;
    if (options.hideMonthlyInstallment && row.key === 'monthly_installment_amount') return false;
    return true;
  });
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
  financeSkipped = false,
  massarDuplicate = false,
  classMissingForFinance = false,
  enrollmentClassLabel = null,
  schoolId = null,
}: {
  profileState: StudentProfileFormState;
  billingState: StudentCreateBillingFormState;
  suggest: FeePlanSuggestResult | null;
  financeState: StudentCreateFinanceFormState;
  preview: EnrollmentPlanPreviewResult | null;
  previewLoading?: boolean;
  previewError?: string | null;
  financeBlocked: boolean;
  financeSkipped?: boolean;
  massarDuplicate?: boolean;
  classMissingForFinance?: boolean;
  enrollmentClassLabel?: string | null;
  schoolId?: number | null;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  const fullName = buildFullNamePreview(profileState.firstName, profileState.lastName);
  const massarMissing = !hasStudentMassarCode(profileState);
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
  const summaryRows =
    financeReview && !financeReview.customized
      ? filterFinanceSummaryRows(financeReview.summaryRows, {
          hideExpectedTotal: financeReview.finalTotal != null,
          hideMonthlyInstallment: financeReview.monthlyInstallment != null,
        })
      : [];

  return (
    <StudentCreateStyledSection
      icon="review"
      title={t('admin.student360.create.review.title')}
      lead={t('admin.student360.create.reviewStepLead')}
      className="student-create-review"
    >
      <div className="student-create-review-flow">
        {(massarMissing ||
          financeSkipped ||
          (!profileState.academicYearId.trim() && suggest) ||
          (classMissingForFinance && suggest) ||
          massarDuplicate) && (
          <div className="student-create-review-flow__alerts">
            {massarMissing ? (
              <p className="student-create-form__notice" role="status">
                {t('admin.student360.create.review.optionalMassarHint')}
              </p>
            ) : null}
            {financeSkipped ? (
              <p className="student-create-form__notice" role="status">
                {t('admin.student360.create.review.financeSkippedNotice')}
              </p>
            ) : null}
            {!profileState.academicYearId.trim() && suggest ? (
              <p className="student-create-review__alert" role="alert">
                {t('admin.student360.create.review.missingAcademicYearForFinance')}
              </p>
            ) : null}
            {classMissingForFinance && suggest ? (
              <p className="student-create-review__alert" role="alert">
                {t('admin.student360.create.review.missingClassForFinance')}
              </p>
            ) : null}
            {massarDuplicate ? (
              <p className="student-create-review__alert" role="alert">
                {t('admin.student360.create.review.duplicateMassar')}
              </p>
            ) : null}
          </div>
        )}

        <div
          className="student-create-review-stage"
          data-stage-label={t('admin.student360.create.review.stageStudent')}
        >
          <article className="student-create-review-card student-create-review-card--student">
            <div className="student-create-review-hero">
              <p className="student-create-review-hero__eyebrow">
                {t('admin.student360.create.review.studentOverview')}
              </p>
              <h3 className="student-create-review-hero__name" dir="auto">
                {fullName || t('common.dash')}
              </h3>
            </div>
            <dl className="student-create-review-stats">
              <div className="student-create-review-stat">
                <dt>{t('admin.student360.create.review.enrollmentDate')}</dt>
                <dd>{formatDate(profileState.actualJoinDate) || t('common.dash')}</dd>
              </div>
              <div className="student-create-review-stat">
                <dt>{t('nav.classes')}</dt>
                <dd dir="auto">{enrollmentClassLabel ?? t('common.dash')}</dd>
              </div>
              <div className="student-create-review-stat">
                <dt>{t('admin.student360.create.review.billingPartner')}</dt>
                <dd>{billingResponsibilityReviewLabel(t, billingState)}</dd>
              </div>
            </dl>
          </article>
        </div>

        {financeBlocked ? (
          <div className="student-create-fee-plan__alert" role="alert">
            <p>{t('admin.student360.create.finance.noPlanMessage')}</p>
          </div>
        ) : suggest && financeReview ? (
          <div
            className="student-create-review-stage"
            data-stage-label={t('admin.student360.create.review.stageFinance')}
          >
            <article className="student-create-review-card student-create-review-card--finance">
              {financeState.customizePlan && previewStatus !== 'ready' && previewStatus !== 'not_needed' ? (
                <p className="student-create-review__alert" role="alert">
                  {previewError?.trim() || t('admin.student360.create.review.reviewFinanceBeforeSave')}
                </p>
              ) : null}

              <div className="student-create-review-finance-hero">
                <div className="student-create-review-finance-hero__main">
                  <p className="student-create-review-finance-hero__label">
                    {t('admin.student360.create.review.selectedPlan')}
                  </p>
                  <p className="student-create-review-finance-hero__name" dir="auto">
                    {financeReview.planName}
                    <span className="mono student-create-review-finance-hero__id"> #{financeReview.planId}</span>
                  </p>
                  <span
                    className={`student-create-review-badge${financeReview.customized ? ' student-create-review-badge--custom' : ''}`}
                  >
                    {financeReview.customized
                      ? t('admin.student360.create.review.planCustomized')
                      : t('admin.student360.create.review.planOriginal')}
                  </span>
                </div>
                {showPreviewTotals && financeReview.finalTotal != null ? (
                  <p className="student-create-review-finance-hero__total">
                    <span className="student-create-review-finance-hero__total-label">
                      {financeReview.customized
                        ? t('admin.student360.create.finance.preview.finalTotal')
                        : t('admin.student360.create.review.totalDue')}
                    </span>
                    <span className="student-create-review-finance-hero__total-value mono">
                      {formatFinanceCurrency(financeReview.finalTotal, suggest.currency, locale)}
                    </span>
                  </p>
                ) : null}
              </div>

              {(showPreviewTotals && financeReview.customized && financeReview.originalTotal != null) ||
              (showPreviewTotals && financeReview.customized && financeReview.discountTotal != null) ||
              summaryRows.length > 0 ||
              (showPreviewTotals && financeReview.monthlyInstallment != null) ? (
                <dl className="student-create-review-totals">
                  {showPreviewTotals && financeReview.customized && financeReview.originalTotal != null ? (
                    <div className="student-create-review-totals__row">
                      <dt>{t('admin.student360.create.finance.preview.originalTotal')}</dt>
                      <dd className="mono">
                        {formatFinanceCurrency(financeReview.originalTotal, suggest.currency, locale)}
                      </dd>
                    </div>
                  ) : null}
                  {showPreviewTotals && financeReview.customized && financeReview.discountTotal != null ? (
                    <div className="student-create-review-totals__row">
                      <dt>{t('admin.student360.create.finance.preview.discountTotal')}</dt>
                      <dd className="mono">
                        {formatFinanceCurrency(financeReview.discountTotal, suggest.currency, locale)}
                      </dd>
                    </div>
                  ) : null}
                  {summaryRows.map((row) => (
                    <div key={row.key} className="student-create-review-totals__row">
                      <dt>{t(`admin.student360.create.finance.summary.${row.key}`)}</dt>
                      <dd className="mono">
                        {formatFinanceCurrency(row.value, suggest.currency, locale)}
                      </dd>
                    </div>
                  ))}
                  {showPreviewTotals && financeReview.monthlyInstallment != null ? (
                    <div className="student-create-review-totals__row">
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
                </dl>
              ) : null}

              {financeReview.customized && financeReview.customizationReason ? (
                <p className="student-create-review-meta">
                  <span className="student-create-review-meta__label">
                    {t('admin.student360.create.finance.customizationReason')}
                  </span>
                  <span>{formatCustomizationReason(financeReview.customizationReason, t)}</span>
                </p>
              ) : null}

              {financeReview.customized && financeReview.customizationItems.length > 0 ? (
                <div className="student-create-review-customization">
                  <p className="student-create-review-customization__title">
                    {t('admin.student360.create.review.customization.itemsTitle')}
                  </p>
                  <ul className="student-create-review-customization__list">
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

              {firstDue && lastDue ? (
                <p className="student-create-review-meta student-create-review-meta--installments">
                  <span className="student-create-review-meta__label">
                    {t('admin.student360.create.finance.installmentRange')}
                  </span>
                  <span>
                    {formatDate(firstDue)} — {formatDate(lastDue)}
                    <span className="student-create-review-meta__sep">·</span>
                    {t('admin.student360.create.review.installmentCount')}: {selectedPeriods.length}
                  </span>
                </p>
              ) : null}
            </article>
          </div>
        ) : financeSkipped ? null : (
          <p className="student-create-form__footnote student-create-review-flow__footnote">
            {resolveFeePlanSuggestEmptyMessage(
              getFeePlanSuggestPendingReason({
                schoolId: schoolId ?? null,
                academicYearId: profileState.academicYearId,
                levelId: profileState.levelId,
                enrollmentDate: profileState.actualJoinDate,
              }),
              t,
            )}
          </p>
        )}
      </div>
    </StudentCreateStyledSection>
  );
}
