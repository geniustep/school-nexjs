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
    expect(pageSource).toContain('<span>المؤدي</span>');
    expect(pageSource).toContain('<span>طريقة الأداء</span>');
    expect(pageSource).toContain('receipt-payment-facts');
    expect(pageSource).not.toContain('الساعة');
    expect(pageSource).not.toContain('المستلم');
  });

  it('keeps the barcode and places receipt number with date opposite the school brand', () => {
    expect(pageSource).toContain('receipt-number-card__barcode');
    expect(pageSource).toContain('receipt-number-card__date');
    expect(pageSource).toContain('receipt-school-identity');
    expect(cssSource).toContain("grid-template-areas: 'number identity'");
  });

  it('highlights the authoritative total in a dedicated centered card', () => {
    expect(pageSource).toContain('receipt-total-card');
    expect(pageSource).toContain('receipt.collection_amount');
    expect(cssSource).toContain('.receipt-total-card > strong');
    expect(cssSource).toContain('place-items: center');
  });

  it('shows only the issuer name on the administration copy and no copy label on the payer copy', () => {
    expect(pageSource).toContain("copy === 'admin' && issuer");
    expect(pageSource).toContain('receipt-issuer');
    expect(pageSource).not.toContain('من قام بإصدار الوصل');
  });

  it('prints family student metadata including Massar and class when supplied by the receipt contract', () => {
    expect(pageSource).toContain("['massar', 'massar_number', 'massar_code', 'massar_id']");
    expect(pageSource).toContain("['class_name', 'section_name', 'classroom_name']");
    expect(pageSource).toContain('SiblingRoster');
    expect(pageSource).toContain('التلاميذ المشمولون في الوصل');
    expect(pageSource).toContain('القسم:');
    expect(pageSource).toContain('مسار:');
  });

  it('shows remaining amounts only when the backend receipt provides them', () => {
    expect(pageSource).toContain('remaining_after_payment');
    expect(pageSource).toContain('remaining_amount');
    expect(pageSource).toContain('balance_after_payment');
    expect(pageSource).not.toContain('rowRemainings.reduce');
  });
});
