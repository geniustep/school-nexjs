import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const entrySource = readFileSync(
  resolve('src/features/admin/student-finance/components/student-360-payment-entry.tsx'),
  'utf8',
);
const formSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-workflow-form.tsx'),
  'utf8',
);
const drawerSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-drawer.tsx'),
  'utf8',
);

describe('Student 360 family collection entry wiring', () => {
  it('requires an explicit student-or-family choice when multiple children are billed', () => {
    expect(entrySource).toContain('resolveStudent360PaymentEntryRoute');
    expect(entrySource).toContain('StudentPaymentFamilyChoiceDialog');
    expect(entrySource).toContain('setChoiceDialogOpen(true)');
    expect(entrySource).toContain("choice === 'family' && familyContext");
    expect(entrySource).toContain('entrySource="student360"');
    expect(entrySource).toContain('prefilledStudentId={familyContext.studentId}');
  });

  it('passes student360 entry props through FamilyCollectionDrawer', () => {
    expect(drawerSource).toContain('prefilledStudentId');
    expect(drawerSource).toContain('prefilledStudentName');
    expect(drawerSource).toContain('entrySource');
  });

  it('keeps family-wide allocation without redundant Student 360 narrative', () => {
    expect(formSource).not.toContain("entrySource === 'student360'");
    expect(formSource).not.toContain('finance-family-collection-student360-context');
    expect(formSource).toContain('FamilyCollectionManualEditor');
    expect(formSource).toContain('FamilyCollectionSmartSummary');
  });

  it('waits for family summary fetch before resolving payment entry route', () => {
    expect(entrySource).toContain('familyFetchStartedRef');
    expect(entrySource).toContain('if (!familyFetchStartedRef.current) return');
  });

  it('keeps normal family drawer allocation explicit without showing the credit switch', () => {
    expect(formSource).toContain('buildFamilyCollectionDraftAllocationFields');
    expect(formSource).toContain('allocation_mode');
    expect(formSource).toContain("const dispositionMode: FamilyCollectionDispositionMode = 'allocate_to_installments'");
    expect(formSource).not.toContain('role="radiogroup"');
    expect(formSource).toContain('unallocatedAmount > 0.009');
  });
});
