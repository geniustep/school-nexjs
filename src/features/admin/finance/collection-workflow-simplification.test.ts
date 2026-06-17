import { describe, expect, it } from 'vitest';
import { autoAllocateOldest } from '@/features/admin/finance/collection-allocation-utils';
import { normalizeInstallmentDisplayLabel } from '@/features/admin/finance/collection-labels';
import { extractHtmlErrorMessage, normalizeOdooHttpError } from '@/lib/api/parse-odoo-error-response';
import { resolveCollectionErrorMessage } from '@/lib/utils/collection-errors';

const t = (key: string) => key;

describe('collection workflow simplification', () => {
  it('auto-allocates oldest installments up to collection amount', () => {
    const rows = [
      { id: 1, remaining_amount: 2500, timing_status: 'overdue', payment_status: 'unpaid' },
      { id: 2, remaining_amount: 2000, timing_status: 'overdue', payment_status: 'unpaid' },
    ] as never[];
    const alloc = autoAllocateOldest(rows, 4500);
    expect(Number(alloc[1])).toBe(2500);
    expect(Number(alloc[2])).toBe(2000);
  });

  it('normalizes French month names in Arabic locale', () => {
    const label = normalizeInstallmentDisplayLabel('التمدرس — juin 2026', 'ar');
    expect(label).toContain('يونيو');
    expect(label).not.toContain('juin');
  });

  it('replaces Single payment in Arabic locale', () => {
    const label = normalizeInstallmentDisplayLabel('Registration — Single payment', 'ar');
    expect(label).toContain('الدفعة الوحيدة');
    expect(label).not.toMatch(/single payment/i);
  });

  it('surfaces Odoo HTML 400 message instead of Unexpected response', () => {
    const html = '<p>لا يمكن إكمال العملية: مفتاح التكرار.</p>';
    const body = normalizeOdooHttpError(400, html);
    expect(!body.success && body.error?.message).toContain('مفتاح التكرار');
    expect(!body.success && body.error?.message).not.toContain('Unexpected response');
  });

  it('maps duplicate_reference to translation key', () => {
    const msg = resolveCollectionErrorMessage('duplicate_reference', 'fallback', t);
    expect(msg).toBe('admin.finance.collectionWorkflow.errors.duplicateReference');
  });

  it('uses Odoo message when code is unknown', () => {
    const msg = resolveCollectionErrorMessage(undefined, 'رسالة من Odoo', t);
    expect(msg).toBe('رسالة من Odoo');
  });

  it('extracts paragraph from HTML error page', () => {
    expect(extractHtmlErrorMessage('<p>خطأ مالي</p>')).toBe('خطأ مالي');
  });
});
