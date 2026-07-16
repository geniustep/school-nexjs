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

  it('preserves multi-student children snapshot breakdown', () => {
    const receipt = normalizeFinanceReceipt({
      id: 88,
      number: 'PAY/2026/000100',
      state: 'issued',
      collection_amount: 5000,
      allocated_amount: 5000,
      is_multi_student: true,
      collection_scope: 'family',
      involved_student_ids: [6857, 6858],
      children_count: 2,
      billing_partner_id: 9046,
      billing_partner_name: 'عائلة تجريبية',
      snapshot: {
        is_multi_student: true,
        children: [
          {
            student_id: 1,
            student_name: 'أحمد العلوي',
            allocated_amount: 2500,
            allocations: [
              { description: 'التسجيل', amount: 1500 },
              { description: 'قسط شتنبر', amount: 1000 },
            ],
          },
          {
            student_id: 2,
            student_name: 'سلمى العلوي',
            allocated_amount: 2500,
            allocations: [
              { description: 'التسجيل', amount: 1500 },
              { description: 'قسط شتنبر', amount: 1000 },
            ],
          },
        ],
      },
    });
    expect(receipt?.is_multi_student).toBe(true);
    expect(receipt?.collection_scope).toBe('family');
    expect(receipt?.involved_student_ids).toEqual([6857, 6858]);
    expect(receipt?.children_count).toBe(2);
    expect(receipt?.billing_partner_id).toBe(9046);
    expect(receipt?.billing_partner_name).toBe('عائلة تجريبية');
    expect(receipt?.children).toHaveLength(2);
    expect(receipt?.children?.[0]?.student_name).toBe('أحمد العلوي');
    expect(receipt?.children?.[0]?.allocations).toHaveLength(2);
    expect(receipt?.children?.[1]?.allocated_amount).toBe(2500);
  });

  it('falls back children_count from children length and drops invalid involved ids', () => {
    const receipt = normalizeFinanceReceipt({
      id: 90,
      number: 'PAY/2026/000102',
      involved_student_ids: [6857, '6858', 'x', null, 12.5],
      children: [
        { student_id: 6857, student_name: 'A', allocated_amount: 100 },
        { student_id: 6858, student_name: 'B', allocated_amount: 200 },
      ],
    });
    expect(receipt?.children_count).toBe(2);
    expect(receipt?.involved_student_ids).toEqual([6857, 6858]);
    expect(receipt?.is_multi_student).toBe(true);
  });

  it('infers multi-student from children length when flag absent', () => {
    const receipt = normalizeFinanceReceipt({
      id: 89,
      number: 'PAY/2026/000101',
      children: [
        { student_id: 10, student_name: 'A', allocated_amount: 100 },
        { student_id: 11, student_name: 'B', allocated_amount: 200 },
      ],
    });
    expect(receipt?.is_multi_student).toBe(true);
    expect(receipt?.children?.[1]?.student_name).toBe('B');
  });

  it('builds readable pdf filenames', () => {
    expect(
      buildReceiptPdfFilename({ id: 6, number: 'PAY/2026/000008' } as never, 'ar'),
    ).toBe('receipt-PAY-2026-000008-ar-a4.pdf');
  });
});
