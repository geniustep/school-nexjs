import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const printDir = join(
  process.cwd(),
  'src',
  'app',
  'admin',
  'finance',
  'receipts',
  '[id]',
  'print',
);

const pageSource = readFileSync(join(printDir, 'page.tsx'), 'utf8');
const fixCss = readFileSync(join(printDir, 'receipt-html-print-fix.css'), 'utf8');

describe('HTML receipt visual parity regression', () => {
  it('does not let the total card absorb the optional sibling flexible row', () => {
    expect(fixCss).toContain('display: flex !important');
    expect(fixCss).toContain('flex-direction: column !important');
    expect(fixCss).toContain('.receipt-total-card');
    expect(fixCss).toContain('flex: 0 0 auto !important');
    expect(fixCss).toContain('margin-top: auto !important');
  });

  it('keeps the approved school identity, receipt/date card and barcode structure', () => {
    expect(pageSource).toContain('receipt-school-identity');
    expect(pageSource).toContain('receipt-number-card__barcode');
    expect(pageSource).toContain('receipt-number-card__date');
    expect(pageSource).not.toContain('<h1>وصل الأداء</h1>');
  });

  it('keeps payer-only payment facts and the centered authoritative total', () => {
    expect(pageSource).toContain('<span>طريقة الأداء</span>');
    expect(pageSource).toContain('<span>المؤدي</span>');
    expect(pageSource).toContain('receipt.collection_amount');
    expect(pageSource).not.toContain('الساعة');
    expect(pageSource).not.toContain('المستلم');
  });

  it('retains Massar, class, sibling and backend remaining-value support', () => {
    expect(pageSource).toContain("['massar', 'massar_number', 'massar_code', 'massar_id']");
    expect(pageSource).toContain("['class_name', 'section_name', 'classroom_name', 'class_label']");
    expect(pageSource).toContain('SiblingRoster');
    expect(pageSource).toContain('remaining_after_payment');
    expect(pageSource).toContain('remaining_amount');
    expect(pageSource).toContain('balance_after_payment');
  });

  it('preserves the one-page A5 geometry and exact cut midpoint contract', () => {
    expect(fixCss).toContain('height: 205mm !important');
    expect(fixCss).toContain('margin: 2.5mm auto 0 !important');
    expect(fixCss).toContain('grid-template-rows: 98.5mm 2mm 98.5mm !important');
  });
});
