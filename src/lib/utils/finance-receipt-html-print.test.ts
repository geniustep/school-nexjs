import { describe, expect, it } from 'vitest';
import {
  buildReceiptHtmlPrintPath,
  normalizeReceiptHtmlPrintLang,
} from '@/lib/utils/finance-receipt-html-print';

describe('HTML A5 double receipt print contract', () => {
  it('builds a Next.js-only preview route without automatic printing by default', () => {
    const path = buildReceiptHtmlPrintPath(1716, 'ar');

    expect(path).toBe('/admin/finance/receipts/1716/print?lang=ar');
    expect(path).not.toContain('/api/');
    expect(path.toLowerCase()).not.toContain('pdf');
    expect(path).not.toContain('auto=1');
  });

  it('can explicitly request automatic printing when needed', () => {
    expect(buildReceiptHtmlPrintPath('RCPT-42', 'fr', { autoPrint: true })).toBe(
      '/admin/finance/receipts/RCPT-42/print?lang=fr&auto=1',
    );
  });

  it('fails safely to Arabic for unsupported or missing print languages', () => {
    expect(normalizeReceiptHtmlPrintLang('fr')).toBe('fr');
    expect(normalizeReceiptHtmlPrintLang('es')).toBe('ar');
    expect(normalizeReceiptHtmlPrintLang(null)).toBe('ar');
  });
});
