import type { FinanceReviewBillingPartnerPresentation } from '../types/finance-review';

/** True when backend blocked partner alignment and supplied a block reason. */
export function shouldShowFinanceReviewCollectionsLink(
  mismatch: FinanceReviewBillingPartnerPresentation | null | undefined,
): boolean {
  if (!mismatch || mismatch.resolutionAvailable) return false;
  return Boolean(mismatch.resolutionBlockReason?.trim());
}
