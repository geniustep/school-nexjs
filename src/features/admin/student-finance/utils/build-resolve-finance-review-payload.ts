import type { ResolveFinanceReviewPayload } from '../types/finance-review';

export function canSubmitResolveFinanceReview(reason: string): boolean {
  return reason.trim().length > 0;
}

export function buildResolveFinanceReviewPayload(reason: string): ResolveFinanceReviewPayload {
  return {
    reason: reason.trim(),
    strategy: 'align_agreement_to_profile',
  };
}
