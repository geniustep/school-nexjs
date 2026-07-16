/**
 * List/row presentation helpers for family (multi-student) receipts.
 * Display-only — does not recompute financial amounts.
 */

import type { FinanceReceipt } from '@/types/finance';

export type FamilyReceiptPresentSource = Pick<
  FinanceReceipt,
  'is_multi_student' | 'children_count' | 'children' | 'student_name' | 'student_id'
>;

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export function resolveReceiptChildrenCount(
  receipt: FamilyReceiptPresentSource,
): number | undefined {
  if (typeof receipt.children_count === 'number' && Number.isFinite(receipt.children_count)) {
    return receipt.children_count;
  }
  if (receipt.children?.length) return receipt.children.length;
  return undefined;
}

/** True when the receipt covers more than one student. */
export function isFamilyReceipt(receipt: FamilyReceiptPresentSource): boolean {
  if (receipt.is_multi_student === true) return true;
  const count = resolveReceiptChildrenCount(receipt);
  return count != null && count > 1;
}

/**
 * Compact children label for tables:
 * - "سلمى + ابن آخر" / "Name + 1 other"
 * - or count-only fallback ("طفلان" / "2 children")
 */
export function formatReceiptChildrenSummary(
  receipt: FamilyReceiptPresentSource,
  t: TranslateFn,
): string | null {
  const count = resolveReceiptChildrenCount(receipt);
  if (count == null || count < 1) return null;

  const names = (receipt.children ?? [])
    .map((child) => child.student_name?.trim())
    .filter((name): name is string => !!name);

  if (names.length === 0) {
    return t('admin.finance.receipts.childrenCountLabel', { count });
  }

  if (count === 1 || names.length === 1) {
    return names[0] ?? t('admin.finance.receipts.childrenCountLabel', { count: 1 });
  }

  const remaining = Math.max(count - 1, names.length - 1);
  if (remaining <= 0) return names[0];
  return t('admin.finance.receipts.childrenSummaryNamed', {
    name: names[0],
    remaining,
  });
}
