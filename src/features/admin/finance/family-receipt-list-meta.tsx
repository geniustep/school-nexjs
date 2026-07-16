'use client';

import { Badge } from '@/components/ui/primitives';
import {
  formatReceiptChildrenSummary,
  isFamilyReceipt,
  resolveReceiptChildrenCount,
} from '@/features/admin/finance/utils/family-receipt-present';
import { useT } from '@/features/i18n/locale-context';
import type { FinanceReceipt } from '@/types/finance';

type FamilyReceiptSource = Pick<
  FinanceReceipt,
  'is_multi_student' | 'children_count' | 'children' | 'student_name' | 'student_id'
>;

/** Compact family marker for list rows — badge + optional children summary. */
export function FamilyReceiptListMeta({
  receipt,
  showSummary = true,
}: {
  receipt: FamilyReceiptSource;
  showSummary?: boolean;
}) {
  const t = useT();
  if (!isFamilyReceipt(receipt)) return null;

  const count = resolveReceiptChildrenCount(receipt);
  const summary = showSummary ? formatReceiptChildrenSummary(receipt, t) : null;

  return (
    <span className="finance-receipt-family-meta">
      <Badge tone="blue">{t('admin.finance.receipts.familyReceiptBadge')}</Badge>
      {showSummary && summary ? (
        <span className="muted tiny" dir="auto">
          {summary}
        </span>
      ) : count != null ? (
        <span className="muted tiny" dir="ltr">
          {t('admin.finance.receipts.childrenCountLabel', { count })}
        </span>
      ) : null}
    </span>
  );
}
