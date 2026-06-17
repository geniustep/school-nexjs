import type { FeePlanEligibleStudent, FeePlanEligibilityStatus } from '@/types/fee-plan-eligible-students';

export function feePlanEligibilityStatusLabelKey(status: FeePlanEligibilityStatus): string {
  switch (status) {
    case 'eligible':
      return 'admin.finance.assignFlow.eligible';
    case 'already_assigned':
      return 'admin.finance.assignFlow.alreadyAssigned';
    case 'level_out_of_scope':
      return 'admin.finance.assignFlow.ineligibleReason.levelOutOfScope';
    case 'no_active_enrollment':
      return 'admin.finance.assignFlow.ineligibleReason.noActiveEnrollment';
    case 'wrong_academic_year':
      return 'admin.finance.assignFlow.ineligibleReason.wrongAcademicYear';
    case 'billing_review_required':
      return 'admin.finance.assignFlow.ineligibleReason.billingReviewRequired';
    default:
      return 'admin.finance.assignFlow.ineligibleReason.other';
  }
}

export function feePlanEligibilityReasonLabelKey(
  student: Pick<FeePlanEligibleStudent, 'eligibility_status' | 'eligibility_reason'>,
): string {
  const reason = (student.eligibility_reason ?? '').toLowerCase();
  if (reason.includes('outside') && reason.includes('scope')) {
    return 'admin.finance.assignFlow.ineligibleReason.levelOutOfScope';
  }
  if (reason.includes('active enrollment') || reason.includes('no enrollment')) {
    return 'admin.finance.assignFlow.ineligibleReason.noActiveEnrollment';
  }
  if (reason.includes('academic year') || reason.includes('year')) {
    return 'admin.finance.assignFlow.ineligibleReason.wrongAcademicYear';
  }
  if (reason.includes('billing') || reason.includes('partner')) {
    return 'admin.finance.assignFlow.ineligibleReason.billingReviewRequired';
  }
  return feePlanEligibilityStatusLabelKey(student.eligibility_status);
}

export function feePlanBillingReadinessLabelKey(
  student: Pick<FeePlanEligibleStudent, 'billing_ready' | 'billing_will_be_created_automatically'>,
): string {
  if (student.billing_ready) {
    return 'admin.finance.assignFlow.billingReady';
  }
  if (student.billing_will_be_created_automatically) {
    return 'admin.finance.assignFlow.billingWillBeCreated';
  }
  return 'admin.finance.assignFlow.billingNeedsReview';
}

export function feePlanEligibleStudentsErrorMessageKey(code: string | undefined): string | null {
  switch (code) {
    case 'fee_plan_not_found':
      return 'admin.finance.assignFlow.errors.feePlanNotFound';
    case 'fee_plan_not_assignable':
      return 'admin.finance.assignFlow.errors.feePlanNotAssignable';
    case 'fee_plan_academic_year_missing':
      return 'admin.finance.assignFlow.errors.feePlanAcademicYearMissing';
    case 'fee_plan_level_scope_missing':
      return 'admin.finance.assignFlow.errors.feePlanLevelScopeMissing';
    default:
      return null;
  }
}

export function enrollmentStatusLabelKey(status: string | null | undefined): string {
  if (!status) return 'admin.finance.assignFlow.enrollmentUnknown';
  const slug = status.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const key = `admin.finance.assignFlow.enrollmentStatus.${slug}`;
  return key;
}
