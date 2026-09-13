import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { receiptServiceDisplayLabel } from './receipt-service-label';

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

describe('receipt service display label', () => {
  it('replaces recurring Arabic installment mechanics with month and year', () => {
    expect(
      receiptServiceDisplayLabel(
        {
          description: 'واجبات التمدرس — الأقساط — قسط 3/10',
          due_date: '2026-09-15',
        },
        'ar',
      ),
    ).toBe('واجبات التمدرس — شتنبر 2026');
  });

  it('removes installment wording entirely for a single installment', () => {
    expect(
      receiptServiceDisplayLabel(
        {
          description: 'رسوم التسجيل — قسط 1/1',
          due_date: '2026-09-15',
        },
        'ar',
      ),
    ).toBe('رسوم التسجيل');
  });

  it('uses a human French month for recurring installments', () => {
    expect(
      receiptServiceDisplayLabel(
        {
          description: 'Scolarité — Échéance 3/10',
          due_date: '2026-09-15',
        },
        'fr',
      ),
    ).toBe('Scolarité — septembre 2026');
  });

  it('does not mistake an academic year for an installment counter', () => {
    expect(
      receiptServiceDisplayLabel(
        {
          description: 'Scolarité — 2026/2027',
          due_date: '2026-09-15',
        },
        'fr',
      ),
    ).toBe('Scolarité — 2026/2027');
  });

  it('preserves ordinary labels without installment mechanics', () => {
    expect(
      receiptServiceDisplayLabel(
        {
          description: 'Transport scolaire — Zone A',
          due_date: '2026-09-15',
        },
        'fr',
      ),
    ).toBe('Transport scolaire — Zone A');
  });
});

describe('French receipt preview hydration UX', () => {
  it('waits for the current French receipt identities before rendering the sheet', () => {
    expect(pageSource).toContain('const [frenchReadyReceiptId, setFrenchReadyReceiptId] = useState<number | null>(null);');
    expect(pageSource).toContain("lang !== 'fr' ||");
    expect(pageSource).toContain('identities.ready &&');
    expect(pageSource).toContain('frenchReadyReceiptId === receipt.id');
    expect(pageSource).toContain('const waitingForFrenchPreview =');
    expect(pageSource).toContain('waitingForFrenchPreview ? <LoadingState label={text.preparing} /> : null');
    expect(pageSource).toContain('receipt && canPrint && frenchPreviewReady ? (');
  });

  it('keeps printing gated on the same current-receipt readiness', () => {
    expect(pageSource).toContain("(lang === 'fr' && !frenchPreviewReady)");
    expect(pageSource).toContain("if (lang === 'fr' && !frenchPreviewReady) return;");
    expect(pageSource).toContain("disabled={lang === 'fr' && !frenchPreviewReady}");
  });

  it('shows an explicit French preparation state instead of an Arabic receipt flash', () => {
    expect(pageSource).toContain("preparing: 'Préparation du reçu en français…'");
  });
});
