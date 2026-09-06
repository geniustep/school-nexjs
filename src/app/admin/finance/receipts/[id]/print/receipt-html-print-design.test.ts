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
const cssSource = readFileSync(join(printDir, 'receipt-html-print.css'), 'utf8');
const fixCssSource = readFileSync(join(printDir, 'receipt-html-print-fix.css'), 'utf8');

describe('HTML receipt final visual contract', () => {
  it('keeps the receipt title/copy labels out of the printed receipt', () => {
    expect(pageSource).not.toContain('نسخة الإدارة');
    expect(pageSource).not.toContain('نسخة المؤدي');
    expect(pageSource).not.toContain('<h1>وصل الأداء</h1>');
  });

  it('keeps payer terminology and the authoritative backend total', () => {
    expect(pageSource).toContain('<span>المؤدي</span>');
    expect(pageSource).toContain('<span>طريقة الأداء</span>');
    expect(pageSource).toContain('receipt.collection_amount');
    expect(pageSource).not.toContain('receipt.collection_amount -');
    expect(pageSource).not.toContain('row.amount -');
  });

  it('prints the payment date in an isolated left-to-right DD/MM/YYYY value', () => {
    expect(pageSource).toContain("value.match(/^(\\d{4})-(\\d{2})-(\\d{2})/)");
    expect(pageSource).toContain('`${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`');
    expect(pageSource).toContain('receipt-number-card__date-value');
    expect(fixCssSource).toContain('unicode-bidi: isolate !important');
    expect(fixCssSource).toContain('font-variant-numeric: tabular-nums');
  });

  it('uses stronger visual icons for date, payment method, and payer', () => {
    expect(pageSource).toContain('strokeWidth: 2.3');
    expect(pageSource).toContain('receipt-meta-icon--calendar');
    expect(pageSource).toContain('receipt-meta-icon--wallet');
    expect(pageSource).toContain('receipt-meta-icon--user');
    expect(fixCssSource).toContain('border: 0.28mm solid rgba(6, 111, 120, 0.2)');
    expect(fixCssSource).toContain('width: 5.15mm');
  });

  it('removes the sibling summary cards above the details table', () => {
    expect(pageSource).not.toContain('SiblingRoster');
    expect(pageSource).not.toContain('التلاميذ المشمولون في الوصل');
    expect(pageSource).not.toContain('<SiblingRoster');
  });

  it('removes class/section from the receipt while keeping level and Massar support', () => {
    expect(pageSource).not.toContain('القسم:');
    expect(pageSource).not.toContain('className');
    expect(pageSource).not.toContain("['class_name', 'section_name', 'classroom_name', 'class_label']");
    expect(pageSource).toContain("['level_name', 'grade_name', 'academic_level_name', 'level_label']");
    expect(pageSource).toContain("['massar', 'massar_number', 'massar_code', 'massar_id']");
    expect(pageSource).toContain('المستوى:');
    expect(pageSource).toContain('رقم مسار:');
  });

  it('splits seven or more rows evenly into right and left detail tables', () => {
    expect(pageSource).toContain('const splitTable = rows.length > 6');
    expect(pageSource).toContain('const splitIndex = Math.ceil(rows.length / 2)');
    expect(pageSource).toContain('const rightRows = splitTable ? rows.slice(0, splitIndex) : rows');
    expect(pageSource).toContain('const leftRows = splitTable ? rows.slice(splitIndex) : []');
    expect(pageSource).toContain('receipt-details__column--right');
    expect(pageSource).toContain('receipt-details__column--left');
    expect(fixCssSource).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
  });

  it('keeps one total card below the details area and never switches paper layout', () => {
    expect(pageSource.match(/<section className="receipt-total-card">/g)?.length).toBe(1);
    expect(pageSource).toContain('data-layout="double"');
    expect(pageSource).not.toContain("data-layout={extended ? 'extended' : 'double'}");
    expect(fixCssSource).not.toContain("data-layout='extended'");
    expect(cssSource).toContain('@page { size: A5 portrait; margin: 0; }');
  });

  it('preserves nested/direct family allocation matching without forcing the first child', () => {
    expect(pageSource).toContain('matchChild');
    expect(pageSource).toContain('allocationIdentity');
    expect(pageSource).toContain('return [...childRows, ...directRows]');
    expect(pageSource).toContain("return children.length === 1 ? children[0] : undefined");
  });

  it('shows remaining values only when supplied by the backend receipt', () => {
    expect(pageSource).toContain('remaining_after_payment');
    expect(pageSource).toContain('remaining_amount');
    expect(pageSource).toContain('balance_after_payment');
    expect(pageSource).toContain('remaining_due');
    expect(pageSource).toContain('outstanding_amount');
    expect(pageSource).toContain('rowRemaining(row)');
    expect(pageSource).not.toContain('rowRemainings.reduce');
  });
});
