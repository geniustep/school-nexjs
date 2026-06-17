import { describe, expect, it } from 'vitest';
import {
  extractHtmlErrorMessage,
  isApiErrorEnvelope,
  normalizeOdooHttpError,
} from '@/lib/api/parse-odoo-error-response';

describe('parse-odoo-error-response', () => {
  it('extracts Arabic message from Odoo HTML 400 page', () => {
    const html =
      '<!doctype html><html><title>400 Bad Request</title><p>لا يمكن إكمال العملية: مفتاح التكرار موجود.</p></html>';
    expect(extractHtmlErrorMessage(html)).toBe('لا يمكن إكمال العملية: مفتاح التكرار موجود.');
  });

  it('normalizes HTML error to envelope with inferred duplicate_reference code', () => {
    const html = '<p>يوجد تحصيل دفع بهذا مفتاح التكرار لهذه المدرسة بالفعل.</p>';
    const body = normalizeOdooHttpError(400, html);
    expect(body.success).toBe(false);
    if (!body.success) {
      expect(body.error?.code).toBe('duplicate_reference');
      expect(body.error?.message).toContain('تكرار');
    }
  });

  it('detects valid API error envelope', () => {
    expect(
      isApiErrorEnvelope({
        success: false,
        error: { code: 'billing_partner_required', message: 'Required', details: {} },
        meta: {},
      }),
    ).toBe(true);
    expect(isApiErrorEnvelope({ success: true, data: {}, meta: {} })).toBe(false);
  });
});
