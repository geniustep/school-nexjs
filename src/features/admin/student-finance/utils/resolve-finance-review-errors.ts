import type { ApiErrorBody } from '@/types/api';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : readString(asRecord(item)?.code)))
    .filter((item): item is string => Boolean(item));
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function readSscErrorDetails(error?: ApiErrorBody | null): {
  amendBlockCode: string | null;
  financeReviewReasons: string[];
  blockingReasons: string[];
} {
  const details = asRecord(error?.details);
  const ssc =
    asRecord(details?.ssc_details) ??
    asRecord((error as Record<string, unknown> | undefined)?.ssc_details);
  return {
    amendBlockCode: readString(ssc?.amend_block_code),
    financeReviewReasons: readStringArray(ssc?.finance_review_reasons),
    blockingReasons: readStringArray(ssc?.blocking_reasons),
  };
}

export function resolveFinanceReviewErrorMessageKey(code: string | undefined): string | null {
  switch (code) {
    case 'finance_review_reason_required':
      return 'admin.student360.financeWorkspace.financeReview.errors.reasonRequired';
    case 'finance_review_not_resolvable':
      return 'admin.student360.financeWorkspace.financeReview.errors.notResolvable';
    case 'billing_partner_reconciliation_no_mismatch':
      return 'admin.student360.financeWorkspace.financeReview.errors.noMismatch';
    case 'finance_review_sync_failed':
      return 'admin.student360.financeWorkspace.financeReview.errors.syncFailed';
    default:
      return null;
  }
}

export function resolveFinanceReviewErrorMessage(
  code: string | undefined,
  message: string | undefined,
  t: (key: string) => string,
): string {
  const key = resolveFinanceReviewErrorMessageKey(code);
  if (key) {
    const label = t(key);
    if (label !== key) return label;
  }
  if (message && message !== code) return message;
  return t('admin.student360.financeWorkspace.financeReview.errors.generic');
}
