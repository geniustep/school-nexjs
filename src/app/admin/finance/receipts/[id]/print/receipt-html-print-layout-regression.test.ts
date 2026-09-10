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
const columnAlignmentCss = readFileSync(
  join(printDir, 'receipt-html-print-column-alignment.css'),
  'utf8',
);
const layoutSource = readFileSync(join(printDir, 'layout.tsx'), 'utf8');

describe('HTML receipt visual parity regression', () => {
  it('keeps the total outside the flexible details flow', () => {
    expect(fixCss).toContain('display: flex !important');
    expect(fixCss).toContain('flex-direction: column !important');
    expect(fixCss).toContain('.receipt-total-card');
    expect(fixCss).toContain('flex: 0 0 auto !important');
    expect(fixCss).toContain('margin-top: auto !important');
  });

  it('keeps the school identity, receipt/date card and barcode structure', () => {
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

  it('retains level, Massar, family matching and backend remaining-value support without class output', () => {
    expect(pageSource).toContain("['massar', 'massar_number', 'massar_code', 'massar_id']");
    expect(pageSource).toContain("['level_name', 'grade_name', 'academic_level_name', 'level_label']");
    expect(pageSource).not.toContain('القسم:');
    expect(pageSource).not.toContain('SiblingRoster');
    expect(pageSource).toContain('matchChild');
    expect(pageSource).toContain('remaining_after_payment');
    expect(pageSource).toContain('remaining_amount');
    expect(pageSource).toContain('balance_after_payment');
  });

  it('uses two equal detail columns for dense receipts and keeps the total below them', () => {
    expect(pageSource).toContain('rows.length > 6');
    expect(pageSource).toContain('Math.ceil(rows.length / 2)');
    expect(pageSource).toContain('receipt-details__columns');
    expect(fixCss).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(pageSource.indexOf('receipt-details')).toBeLessThan(pageSource.indexOf('receipt-total-card'));
  });

  it('pins both split tables to the same grid row so their heights do not stack', () => {
    expect(layoutSource).toContain("import './receipt-html-print-column-alignment.css';");
    expect(columnAlignmentCss).toContain('.receipt-details__column--left,');
    expect(columnAlignmentCss).toContain('.receipt-details__column--right');
    expect(columnAlignmentCss).toContain('grid-row: 1;');
    expect(columnAlignmentCss).toContain('grid-column: 1;');
    expect(columnAlignmentCss).toContain('grid-column: 2;');
    expect(columnAlignmentCss).toContain('align-items: start;');
  });

  it('preserves the one-page A5 geometry and exact cut midpoint contract for every receipt size', () => {
    expect(pageSource).toContain('data-layout="double"');
    expect(fixCss).toContain('width: 148mm !important');
    expect(fixCss).toContain('height: 205mm !important');
    expect(fixCss).toContain('margin: 2.5mm auto 0 !important');
    expect(fixCss).toContain('grid-template-rows: 98.5mm 2mm 98.5mm !important');
    expect(fixCss).not.toContain("data-layout='extended'");
  });
});
