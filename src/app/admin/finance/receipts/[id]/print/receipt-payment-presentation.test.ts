import { describe, expect, it } from 'vitest';
import type { FinanceReceiptAllocation } from '@/types/finance';
import {
  receiptPaymentMethodLabel,
  receiptServiceLabel,
} from './receipt-payment-presentation';

describe('receipt payment presentation', () => {
  it('preserves the existing payment-method presentation semantics', () => {
    expect(receiptPaymentMethodLabel('import_unspecified', 'fr')).toBe('Non précisé');
    expect(receiptPaymentMethodLabel('import_unspecified', 'ar')).toBe('غير محدد');
    expect(receiptPaymentMethodLabel('cheque', 'fr')).toBe('Chèque');
    expect(receiptPaymentMethodLabel('transfer', 'ar')).toBe('تحويل بنكي');
    expect(receiptPaymentMethodLabel('custom_method', 'fr')).toBe('custom_method');
  });

  it('deduplicates the service name and removes installment sequence wording', () => {
    const row = {
      description: 'التمدرس — التمدرس — قسط 3/10',
      due_date: '2026-10-30',
    } as FinanceReceiptAllocation;

    expect(receiptServiceLabel(row, 'fr')).toBe('التمدرس — octobre 2026');
    expect(receiptServiceLabel(row, 'fr')).not.toContain('قسط');
    expect(receiptServiceLabel(row, 'fr').match(/التمدرس/g)?.length).toBe(1);
  });

  it('shows registration with the authoritative academic year when present', () => {
    const row = {
      description: 'التسجيل — التسجيل — قسط 1/1',
      due_date: '2026-09-01',
      academic_year_name: '2026/2027',
    } as FinanceReceiptAllocation & Record<string, unknown>;

    expect(receiptServiceLabel(row, 'fr')).toBe('التسجيل — 2026/2027');
    expect(receiptServiceLabel(row, 'fr')).not.toContain('قسط');
  });

  it('uses a start-of-school-year due date as registration year fallback', () => {
    const row = {
      description: 'التسجيل — التسجيل — قسط 1/1',
      due_date: '2026-09-01',
    } as FinanceReceiptAllocation;

    expect(receiptServiceLabel(row, 'fr')).toBe('التسجيل — 2026/2027');
  });

  it('shows only the clean service name for another one-time service', () => {
    const row = {
      description: 'التأمين — التأمين',
    } as FinanceReceiptAllocation;

    expect(receiptServiceLabel(row, 'ar')).toBe('التأمين');
  });

  it('uses structured service data and a monthly due date when available', () => {
    const row = {
      description: 'نص قديم — قسط 4/10',
      due_date: '2027-01-15',
      service_name: 'النقل',
      service_frequency: 'monthly',
    } as FinanceReceiptAllocation & Record<string, unknown>;

    expect(receiptServiceLabel(row, 'fr')).toBe('النقل — janvier 2027');
    expect(receiptServiceLabel(row, 'ar')).toContain('2027');
    expect(receiptServiceLabel(row, 'ar')).not.toContain('قسط');
  });

  it('does not reinterpret an installment sequence such as 4/10 as a calendar period', () => {
    const row = {
      description: 'النقل — النقل — قسط 4/10',
    } as FinanceReceiptAllocation;

    expect(receiptServiceLabel(row, 'fr')).toBe('النقل');
  });
});
