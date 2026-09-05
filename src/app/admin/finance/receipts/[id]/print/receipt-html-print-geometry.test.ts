import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
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

describe('HTML A5 print geometry contract', () => {
  it('keeps the receipt inside one physical A5 page with headroom for Chromium rounding', () => {
    expect(css).toContain('height: 205mm !important');
    expect(css).toContain('margin: 2.5mm auto 0 !important');
    expect(css).toContain('height: auto !important');
    expect(css).toContain('min-height: 0 !important');
  });

  it('places the cut line on the exact 105mm midpoint', () => {
    expect(css).toContain('grid-template-rows: 98.5mm 2mm 98.5mm !important');
    expect(css).toContain('height: 2mm !important');

    const topMarginMm = 2.5;
    const sheetPaddingTopMm = 3;
    const firstCopyMm = 98.5;
    const separatorHalfMm = 1;

    expect(topMarginMm + sheetPaddingTopMm + firstCopyMm + separatorHalfMm).toBe(105);
  });
});
