import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const printDir = join(process.cwd(), 'src/app/admin/finance/receipts/[id]/print');
const layoutSource = readFileSync(join(printDir, 'layout.tsx'), 'utf8');
const issuerCss = readFileSync(join(printDir, 'receipt-html-print-issuer-policy.css'), 'utf8');

describe('A5 receipt issuer privacy contract', () => {
  it('loads the issuer privacy stylesheet', () => {
    expect(layoutSource).toContain("import './receipt-html-print-issuer-policy.css';");
  });

  it('never prints the personal employee/collector name and uses institutional copy per language', () => {
    expect(issuerCss).toContain('.receipt-html-copy .receipt-issuer');
    expect(issuerCss).toContain('font-size: 0 !important;');
    expect(issuerCss).toContain("content: 'صادر عن إدارة المؤسسة';");
    expect(issuerCss).toContain('Émis par l’administration de l’établissement');
  });
});
