import { describe, expect, it } from 'vitest';
import {
  isPdfArrayBuffer,
  isPdfContentType,
  PDF_MAGIC,
} from '@/lib/api/odoo-binary-response';
import {
  buildReceiptPdfPath,
  PDF_BLOB_REVOKE_DELAY_MS,
} from '@/lib/api/finance-receipt';
import { buildReceiptPdfFilename } from '@/lib/utils/normalize-finance-receipt';

describe('finance-receipt pdf download', () => {
  it('uses a safe revoke delay instead of immediate cleanup', () => {
    expect(PDF_BLOB_REVOKE_DELAY_MS).toBeGreaterThanOrEqual(30_000);
  });

  it('builds filenames without raw slashes from receipt numbers', () => {
    expect(
      buildReceiptPdfFilename({ id: 6, number: 'PAY/2026/000008' } as never, 'ar'),
    ).toBe('receipt-PAY-2026-000008-ar-a4.pdf');
    expect(
      buildReceiptPdfFilename({ id: 6, number: 'PAY/2026/000008' } as never, 'fr', 'thermal_80mm'),
    ).toBe('receipt-PAY-2026-000008-fr-thermal_80mm.pdf');
  });

  it('passes lang and print_layout query params to the BFF path', () => {
    expect(buildReceiptPdfPath(42, 'ar', 'a5')).toBe(
      '/admin/finance/receipts/42/pdf?lang=ar&print_layout=a5',
    );
    expect(buildReceiptPdfPath(42, 'fr', 'thermal_80mm')).toBe(
      '/admin/finance/receipts/42/pdf?lang=fr&print_layout=thermal_80mm',
    );
  });

  it('rejects non-pdf content types before creating blobs', () => {
    expect(isPdfContentType('application/json')).toBe(false);
    expect(isPdfContentType('text/html')).toBe(false);
    expect(isPdfContentType('application/pdf')).toBe(true);
  });

  it('rejects HTML/JSON buffers masquerading as downloads', () => {
    const json = new TextEncoder().encode('{"success":false}').buffer;
    expect(isPdfArrayBuffer(json)).toBe(false);
    const html = new TextEncoder().encode('<!DOCTYPE html><html').buffer;
    expect(isPdfArrayBuffer(html)).toBe(false);
    const pdf = new TextEncoder().encode(`${PDF_MAGIC}1.7`).buffer;
    expect(isPdfArrayBuffer(pdf)).toBe(true);
  });
});
