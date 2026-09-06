import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const base = join(
  process.cwd(),
  'src',
  'app',
  'admin',
  'finance',
  'receipts',
  '[id]',
  'print',
);

const page = readFileSync(join(base, 'page.tsx'), 'utf8');
const css = readFileSync(join(base, 'receipt-html-print.css'), 'utf8');

describe('HTML A5 receipt content and visual contract', () => {
  it('keeps the approved simplified receipt wording and hierarchy', () => {
    expect(page).toContain('<span>المؤدي</span>');
    expect(page).toContain('<span>طريقة الأداء</span>');
    expect(page).toContain('<span>المجموع</span>');
    expect(page).toContain('شكرًا لكم على ثقتكم');
    expect(page).not.toContain('من أدى');
    expect(page).not.toContain('من قام بإصدار الوصل');
    expect(page).not.toContain('نسخة الإدارة');
    expect(page).not.toContain('نسخة المؤدي');
    expect(page).not.toContain('<h1>وصل الأداء</h1>');
  });

  it('shows Massar, class and remaining values only when provided by the receipt contract', () => {
    expect(page).toContain("'massar_number'");
    expect(page).toContain("'massar_code'");
    expect(page).toContain("'class_name'");
    expect(page).toContain("'section_name'");
    expect(page).toContain('allocationRemaining(row)');
    expect(page).toContain("'remaining_amount'");
    expect(page).toContain("'balance_after_payment'");
    expect(page).toContain('rowRemaining != null');
    expect(page).toContain('remaining != null');
  });

  it('combines family child and flat allocation sources instead of dropping sibling detail', () => {
    expect(page).toContain('receipt.children');
    expect(page).toContain('receipt.snapshot?.children');
    expect(page).toContain('receipt.allocations');
    expect(page).toContain('receipt.snapshot?.allocations');
    expect(page).toContain('childSources(receipt)');
    expect(page).toContain('directAllocations');
    expect(page).not.toContain('if (childRows.length) return childRows');
    expect(page).toContain('التلاميذ المشمولون في الوصل');
  });

  it('matches the approved A5 visual structure while preserving the barcode', () => {
    expect(page).toContain('receipt-number-card__barcode');
    expect(css).toContain("grid-template-columns: 58mm minmax(0, 1fr) 42mm");
    expect(css).toContain('width: 31mm');
    expect(css).toContain('min-height: 15mm');
    expect(css).toContain('font-size: 5.7mm');
  });
});
