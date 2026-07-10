import { describe, expect, it } from 'vitest';
import {
  buildReceiptPdfFilename,
  normalizeFinanceReceipt,
  parseFinanceReceiptList,
  receiptAllowsAction,
} from '@/lib/utils/normalize-finance-receipt';

describe('normalize-finance-receipt', () => {
  it('parses list payloads as arrays', () => {
    const rows = parseFinanceReceiptList([
      {
        id: 1,
        number: 'REC-001',
        state: 'issued',
        settlement_status: 'pending_cheque',
        collection_amount: 500,
        allocated_amount: 500,
        unallocated_amount: 0,
        allowed_actions: ['view', 'download'],
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.number).toBe('REC-001');
    expect(rows[0]?.unallocated_amount).toBe(0);
  });

  it('uses pagination total from meta via caller — not items length', () => {
    const rows = parseFinanceReceiptList([{ id: 1, number: 'A' }]);
    expect(rows.length).toBe(1);
  });

  it('normalizes detail with snapshot totals and cheque', () => {
    const receipt = normalizeFinanceReceipt({
      id: 7,
      number: 'PAY/2026/000009',
      state: 'issued',
      settlement_status: 'cheque_bounced',
      collection_amount: 150,
      allocated_amount: 0,
      unallocated_amount: 150,
      allowed_actions: ['view', 'download', 'print'],
      snapshot: {
        cheque: { number: 'CHQ-1', bank_name: 'Bank', state: 'bounced' },
        totals: { collection_amount: 150, unallocated_amount: 150 },
      },
    });
    expect(receipt?.cheque?.number).toBe('CHQ-1');
    expect(receipt?.unallocated_amount).toBe(150);
    expect(receiptAllowsAction(receipt, 'download')).toBe(true);
    expect(receiptAllowsAction(receipt, 'issue')).toBe(false);
  });

  it('builds readable pdf filenames', () => {
    expect(
      buildReceiptPdfFilename({ id: 6, number: 'PAY/2026/000008' } as never, 'ar'),
    ).toBe('receipt-PAY-2026-000008-ar-a4.pdf');
  });
});
