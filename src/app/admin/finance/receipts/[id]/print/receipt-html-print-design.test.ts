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

const fixCssSource = readFileSync(
  join(
    process.cwd(),
    'src',
    'app',
    'admin',
    'finance',
    'receipts',
    '[id]',
    'print',
    'receipt-html-print-fix.css',
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

  it('restores visual icons for date, payment method, and payer', () => {
    expect(pageSource).toContain('receipt-meta-icon--calendar');
    expect(pageSource).toContain('receipt-meta-icon--wallet');
    expect(pageSource).toContain('receipt-meta-icon--user');
    expect(pageSource).toContain('<ReceiptIcon name="calendar" />');
    expect(pageSource).toContain('<ReceiptIcon name="wallet" />');
    expect(pageSource).toContain('<ReceiptIcon name="user" />');
    expect(fixCssSource).toContain('.receipt-meta-icon');
  });

  it('highlights the authoritative total in a dedicated centered card', () => {
    expect(pageSource).toContain('receipt-total-card');
    expect(pageSource).toContain('receipt.collection_amount');
    expect(cssSource).toContain('.receipt-total-card > strong');
    expect(cssSource).toContain('place-items: center');
    expect(fixCssSource).toContain('.receipt-total-card::before');
    expect(fixCssSource).toContain('font-size: 6.15mm !important');
  });

  it('shows only the issuer name on the administration copy and no copy label on the payer copy', () => {
    expect(pageSource).toContain("copy === 'admin' && issuer");
    expect(pageSource).toContain('receipt-issuer');
    expect(pageSource).not.toContain('من قام بإصدار الوصل');
  });

  it('prints level, class and Massar under each student when supplied by the receipt contract', () => {
    expect(pageSource).toContain("['massar', 'massar_number', 'massar_code', 'massar_id']");
    expect(pageSource).toContain("['class_name', 'section_name', 'classroom_name', 'class_label']");
    expect(pageSource).toContain("['level_name', 'grade_name', 'academic_level_name', 'level_label']");
    expect(pageSource).toContain('المستوى:');
    expect(pageSource).toContain('القسم:');
    expect(pageSource).toContain('رقم مسار:');
  });

  it('preserves sibling identities and combines nested and direct family allocations without forcing the first child', () => {
    expect(pageSource).toContain('SiblingRoster');
    expect(pageSource).toContain('التلاميذ المشمولون في الوصل');
    expect(pageSource).toContain('matchChild');
    expect(pageSource).toContain('allocationIdentity');
    expect(pageSource).toContain('return [...childRows, ...directRows]');
    expect(pageSource).toContain("return children.length === 1 ? children[0] : undefined");
  });

  it('shows remaining amounts only when the backend receipt provides them', () => {
    expect(pageSource).toContain('remaining_after_payment');
    expect(pageSource).toContain('remaining_amount');
    expect(pageSource).toContain('balance_after_payment');
    expect(pageSource).toContain('remaining_due');
    expect(pageSource).toContain('outstanding_amount');
    expect(pageSource).toContain('rowRemaining(row)');
    expect(pageSource).not.toContain('receipt.collection_amount -');
    expect(pageSource).not.toContain('row.amount -');
    expect(pageSource).not.toContain('rowRemainings.reduce');
  });

  it('falls back to full A5 copies for long receipts instead of clipping installment rows', () => {
    expect(pageSource).toContain("data-layout={extended ? 'extended' : 'double'}");
    expect(pageSource).toContain('rows.length > 9 || students.length > 4');
    expect(fixCssSource).toContain(".receipt-html-sheet[data-layout='extended']");
    expect(fixCssSource).toContain('overflow: visible !important');
    expect(fixCssSource).toContain('page-break-after: always !important');
    expect(fixCssSource).toContain('page-break-inside: auto !important');
  });
});
