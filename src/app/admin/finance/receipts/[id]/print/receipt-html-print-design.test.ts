import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  join(
    process.cwd(),
    'src',
    'app',
    'admin',
    'finance',
    'receipts',
    '[id]',
    'print',
    'page.tsx',
  ),
  'utf8',
);

const cssSource = readFileSync(
  join(
    process.cwd(),
    'src',
    'app',
    'admin',
    'finance',
    'receipts',
    '[id]',
    'print',
    'receipt-html-print.css',
  ),
  'utf8',
);

describe('HTML receipt final visual contract', () => {
  it('removes copy labels and the receipt title from the printed receipt', () => {
    expect(pageSource).not.toContain('نسخة الإدارة');
    expect(pageSource).not.toContain('نسخة المؤدي');
    expect(pageSource).not.toContain('<h1>وصل الأداء</h1>');
  });

  it('uses payer terminology and keeps the information card limited to payer and payment method', () => {
    expect(pageSource).toContain("payer: 'المؤدي'");
    expect(pageSource).toContain('PaymentMetaItem icon="user"');
    expect(pageSource).toContain('PaymentMetaItem icon="wallet"');
    expect(pageSource).not.toContain('ar="الساعة"');
    expect(pageSource).not.toContain('ar="المستلم"');
  });

  it('keeps the barcode and places receipt number with date opposite the school brand', () => {
    expect(pageSource).toContain('receipt-html-number-card__barcode');
    expect(pageSource).toContain('receipt-html-number-card__date');
    expect(pageSource).toContain('receipt-html-school-brand');
    expect(cssSource).toContain("grid-template-areas: 'number brand'");
  });

  it('highlights the authoritative total in a dedicated centered card', () => {
    expect(pageSource).toContain('receipt-html-total-card');
    expect(pageSource).toContain('receipt.collection_amount');
    expect(cssSource).toContain('receipt-html-total-card__value');
    expect(cssSource).toContain('justify-items: center');
  });

  it('shows only the issuer name on the administration copy and no copy label on the payer copy', () => {
    expect(pageSource).toContain("copy === 'admin' && issuer");
    expect(pageSource).not.toContain('من قام بإصدار الوصل');
  });
});
