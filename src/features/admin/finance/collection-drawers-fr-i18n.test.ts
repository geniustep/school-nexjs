import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCES = [
  'collection-workflow-form.tsx',
  'family-collection-workflow-form.tsx',
  'student-payment-family-choice-dialog.tsx',
  'quick-payment-core-fields.tsx',
  'collection-success-panel.tsx',
  'collection-review-step.tsx',
  'collection-dues-selection-step.tsx',
  'collection-cheque-fields.tsx',
  'collection-allocation-preview-panel.tsx',
  'family-collection-review-step.tsx',
  'family-collection-allocation-section.tsx',
  'family-collection-manual-editor.tsx',
  'family-collection-smart-summary.tsx',
  'family-collection-drawer.tsx',
  'collection-receipt-section.tsx',
  'collection-sticky-amount.tsx',
  'collection-allocation-summary.tsx',
] as const;

const SHARED = new Set([
  'admin.finance.collectionWorkflow.chequeNotesLabel',
  'admin.finance.collectionWorkflow.chequeNotesSection',
  'common.note',
  'common.dash',
]);

const CRITICAL = [
  'admin.finance.quickPayment.title',
  'admin.finance.quickPayment.amountLabel',
  'admin.finance.quickPayment.paymentSection',
  'admin.finance.quickPayment.confirmAction',
  'admin.finance.quickPayment.currentOverdueLabel',
  'admin.finance.quickPayment.familyChoice.title',
  'admin.finance.quickPayment.familyChoice.description',
  'admin.finance.quickPayment.familyChoice.student',
  'admin.finance.quickPayment.familyChoice.studentDescription',
  'admin.finance.quickPayment.familyChoice.family',
  'admin.finance.quickPayment.familyChoice.familyDescription',
  'admin.finance.quickPayment.familyChoice.continue',
  'admin.finance.collectionWorkflow.drawerTitle',
  'admin.finance.collectionWorkflow.stepAllocation',
  'admin.finance.collectionWorkflow.stepReview',
  'admin.finance.collectionWorkflow.selectDuesDesc',
  'admin.finance.collectionWorkflow.continueToReview',
  'admin.finance.collectionWorkflow.quickOverdue',
  'admin.finance.collectionWorkflow.quickDueToday',
  'admin.finance.collectionWorkflow.quickNextInstallment',
  'admin.finance.collectionWorkflow.quickFullBalance',
  'admin.finance.collectionWorkflow.paymentSuccessTitle',
  'admin.finance.collectionWorkflow.paymentSuccessBody',
  'admin.student360.financeWorkspace.pageTitle',
] as const;

function loadLocale(locale: 'fr' | 'en'): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve('messages', `${locale}.json`), 'utf8')) as Record<string, unknown>;
}
function at(source: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) =>
    node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined, source);
}
function fields(text: string): string[] {
  return [...text.matchAll(/\{([a-zA-Z_][a-zA-Z_0-9]*)\}/g)].map(x => x[1]).sort();
}
function references(): Set<string> {
  const keys = new Set<string>();
  const re = /\bt\(\s*(['"`])((?:admin|common|academic)\.[^'"`]+)\1/g;
  for (const file of SOURCES) {
    const code = readFileSync(resolve('src/features/admin/finance', file), 'utf8');
    for (const match of code.matchAll(re)) if (!match[2].includes('${')) keys.add(match[2]);
  }
  return keys;
}
const fr = loadLocale('fr');
const en = loadLocale('en');

describe('French finance collection drawers', () => {
  it('defines all statically referenced keys for the two drawer journeys', () => {
    for (const key of references()) {
      const value = at(fr, key);
      expect(typeof value, `Missing French key: ${key}`).toBe('string');
      expect((value as string).trim().length, `Blank French key: ${key}`).toBeGreaterThan(0);
    }
  });
  it('does not show copied English phrases except legitimate shared labels', () => {
    for (const key of references()) {
      const french = at(fr, key);
      const english = at(en, key);
      if (typeof english !== 'string' || SHARED.has(key)) continue;
      expect(french, `Untranslated French drawer label: ${key}`).not.toBe(english);
    }
  });
  it('keeps payment, family, receipt and success labels localized with intact placeholders', () => {
    for (const key of CRITICAL) {
      const french = at(fr, key);
      expect(typeof french, `Missing: ${key}`).toBe('string');
      expect(french, `English value: ${key}`).not.toBe(at(en, key));
      expect(fields(french as string), `Broken placeholders: ${key}`)
        .toEqual(fields(String(at(en, key) ?? '')));
    }
  });
  it('repairs progress and review labels in French', () => {
    expect(at(fr, 'admin.finance.collectionWorkflow.stepProgress'))
      .toBe('Étape {current} sur {total} : {label}');
    expect(at(fr, 'admin.finance.collectionWorkflow.reviewDesc'))
      .toBe('Vérifiez les informations avant de confirmer le paiement.');
  });
  it('uses the existing amount-error translation', () => {
    const code = readFileSync(resolve('src/features/admin/finance/collection-workflow-form.tsx'), 'utf8');
    expect(code).toContain("t('admin.finance.invalidAmount')");
    expect(code).not.toContain("t('admin.finance.errors.invalidAmount')");
  });
});
