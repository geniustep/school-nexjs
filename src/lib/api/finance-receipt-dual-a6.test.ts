import { describe, expect, it } from 'vitest';
import { buildReceiptPdfPath } from '@/lib/api/finance-receipt';
import { buildReceiptPdfFilename } from '@/lib/utils/normalize-finance-receipt';
import type { FinanceReceipt } from '@/types/finance';

describe('dual A6 family receipt print contract', () => {
  it('passes the dual family layout to the receipt PDF endpoint', () => {
    const path = buildReceiptPdfPath(1716, 'ar', 'a5_dual_a6_family');

    expect(path).toContain('lang=ar');
    expect(path).toContain('print_layout=a5_dual_a6_family');
  });

  it('keeps the selected layout in the downloaded filename', () => {
    const receipt = { id: 1716, number: 'RCPT/001' } as FinanceReceipt;

    expect(buildReceiptPdfFilename(receipt, 'fr', 'a5_dual_a6_family')).toBe(
      'receipt-RCPT-001-fr-a5_dual_a6_family.pdf',
    );
  });
});
