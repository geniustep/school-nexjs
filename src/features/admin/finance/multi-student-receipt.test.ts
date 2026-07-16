import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeFinanceReceipt } from '@/lib/utils/normalize-finance-receipt';

const receiptViewSource = readFileSync(
  resolve('src/features/admin/finance/receipt-detail-view.tsx'),
  'utf8',
);

describe('multi-student receipt presentation', () => {
  it('renders child allocation lines from snapshot children', () => {
    expect(receiptViewSource).toContain('isMultiStudent');
    expect(receiptViewSource).toContain('childAllocations');
    expect(receiptViewSource).toContain('receipt-details__child-lines');
    expect(receiptViewSource).toContain('admin.finance.receipts.familyReceiptBadge');
  });

  it('maps snapshot children into receipt children for UI', () => {
    const receipt = normalizeFinanceReceipt({
      id: 12,
      number: 'R-12',
      collection_amount: 4000,
      snapshot: {
        children: [
          {
            student_id: 1,
            student_name: 'أحمد',
            allocated_amount: 2500,
            allocations: [{ description: 'التسجيل', amount: 1500 }, { label: 'شتنبر', amount: 1000 }],
          },
          {
            student_id: 2,
            student_name: 'سلمى',
            allocated_amount: 1500,
            allocations: [{ description: 'التسجيل', amount: 1500 }],
          },
        ],
      },
    });
    expect(receipt?.children).toHaveLength(2);
    expect(receipt?.is_multi_student).toBe(true);
    expect(receipt?.children?.[0]?.allocations?.[0]?.description).toBe('التسجيل');
    expect(receipt?.children?.[1]?.allocated_amount).toBe(1500);
  });
});
