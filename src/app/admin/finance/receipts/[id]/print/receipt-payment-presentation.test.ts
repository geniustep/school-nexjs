import { describe, expect, it } from 'vitest';
import type { FinanceReceiptAllocation } from '@/types/finance';
import {
  receiptPaymentMethodLabel,
  receiptServiceLabel,
} from './receipt-payment-presentation';

describe('receipt payment presentation', () => {
  it('defaults unspecified payment methods to cash in both receipt languages', () => {
    expect(receiptPaymentMethodLabel(undefined, 'fr')).toBe('Espèces');
    expect(receiptPaymentMethodLabel('import_unspecified', 'fr')).toBe('Espèces');
    expect(receiptPaymentMethodLabel('Non précisé', 'fr')).toBe('Espèces');
    expect(receiptPaymentMethodLabel('import_unspecified', 'ar')).toBe('نقدًا');
  });

  it('keeps known non-cash payment methods unchanged semantically', () => {
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

  it('shows only the service name for a one-time service', () => {
    const row = {
      description: 'التسجيل — التسجيل',
    } as FinanceReceiptAllocation;

    expect(receiptServiceLabel(row, 'ar')).toBe('التسجيل');
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
