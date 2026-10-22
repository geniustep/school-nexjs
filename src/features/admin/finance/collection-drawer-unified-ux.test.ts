import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(file), 'utf8');
const student = read('src/features/admin/finance/collection-workflow-form.tsx');
const family = read('src/features/admin/finance/family-collection-workflow-form.tsx');
const drawer = read('src/features/admin/finance/family-collection-drawer.tsx');
const successPanel = read('src/features/admin/finance/collection-success-panel.tsx');

describe('student and family drawer UX consistency', () => {
  it('keeps the amount outside the scrollable content in both embedded flows', () => {
    expect(student).toContain("embedded && step === 'payment' && selectedStudent");
    expect(student).toMatch(/CollectionStickyAmount[\s\S]*finance-collection-workflow__scroll/);
    expect(family).toMatch(/CollectionStickyAmount[\s\S]*finance-collection-workflow__scroll/);
  });

  it('uses the same payment method choice UI and amount presets for family', () => {
    expect(family).toContain('variant="drawer"');
    expect(family).toContain('finance-family-collection-presets__option');
    expect(family).toContain('totalCollectibleLabel');
  });

  it('removes allocation-disposition radio controls without inventing family credit', () => {
    expect(family).not.toContain('role="radiogroup"');
    expect(family).toContain("const dispositionMode: FamilyCollectionDispositionMode = 'allocate_to_installments'");
    expect(family).toContain("unallocatedAmount > 0.009");
    expect(family).toContain('previewResult.preview.unallocated_amount');
    expect(family).toContain('unallocatedRequiresAllocation');
  });

  it('prints the official receipt from the family drawer after success instead of redirecting', () => {
    expect(family).toContain('CollectionSuccessPanel');
    expect(family).toContain('receiptId,');
    expect(family).toContain('onConfirmed?.(completedCollection)');
    expect(drawer).not.toContain('router.push');
    expect(drawer).toContain('confirmedRef.current');
    expect(successPanel).toContain('buildReceiptHtmlPrintPath');
  });

  it('provides translated family amount labels for every supported locale', () => {
    for (const locale of ['ar', 'fr', 'en', 'es'] as const) {
      const messages = JSON.parse(read(`messages/${locale}.json`)) as {
        admin: { finance: { quickPayment: Record<string, string> } };
      };
      expect(messages.admin.finance.quickPayment.totalCollectibleLabel).toBeTruthy();
      expect(messages.admin.finance.quickPayment.unallocatedRequiresAllocation).toBeTruthy();
    }
  });
});
