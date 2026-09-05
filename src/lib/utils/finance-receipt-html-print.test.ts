import { describe, expect, it } from 'vitest';
import {
  buildReceiptHtmlPrintPath,
  normalizeReceiptHtmlPrintLang,
} from '@/lib/utils/finance-receipt-html-print';

describe('HTML A5 double receipt print contract', () => {
  it('builds a Next.js-only print route with automatic printing enabled', () => {
    const path = buildReceiptHtmlPrintPath(1716, 'ar');

    expect(path).toBe('/admin/finance/receipts/1716/print?lang=ar&auto=1');
    expect(path).not.toContain('/api/');
    expect(path.toLowerCase()).not.toContain('pdf');
  });

  it('can open the HTML preview without invoking automatic printing', () => {
    expect(buildReceiptHtmlPrintPath('RCPT-42', 'fr', { autoPrint: false })).toBe(
      '/admin/finance/receipts/RCPT-42/print?lang=fr',
    );
  });

  it('fails safely to Arabic for unsupported or missing print languages', () => {
    expect(normalizeReceiptHtmlPrintLang('fr')).toBe('fr');
    expect(normalizeReceiptHtmlPrintLang('es')).toBe('ar');
    expect(normalizeReceiptHtmlPrintLang(null)).toBe('ar');
  });
});
