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
  it('routes family accounts directly to FamilyCollectionDrawer without the choice dialog', () => {
    expect(entrySource).toContain('resolveStudent360PaymentEntryRoute');
    expect(entrySource).not.toContain('StudentPaymentFamilyChoiceDialog');
    expect(entrySource).toContain('entrySource="student360"');
    expect(entrySource).toContain('prefilledStudentId={familyContext.studentId}');
  });

  it('passes student360 entry props through FamilyCollectionDrawer', () => {
    expect(drawerSource).toContain('prefilledStudentId');
    expect(drawerSource).toContain('prefilledStudentName');
    expect(drawerSource).toContain('entrySource');
  });

  it('shows student360 family context while keeping family-wide manual allocation', () => {
    expect(formSource).toContain('entrySource === \'student360\'');
    expect(formSource).toContain('finance-family-collection-student360-context');
    expect(formSource).toContain('manualAllocationHint');
    expect(formSource).toContain('FamilyCollectionAllocationSection');
  });

  it('waits for family summary fetch before resolving payment entry route', () => {
    expect(entrySource).toContain('familyFetchStartedRef');
    expect(entrySource).toContain('if (!familyFetchStartedRef.current) return');
  });

  it('keeps payload explicit with installment allocations only', () => {
    expect(formSource).toContain('parseFamilyAllocationInputs');
    expect(formSource).not.toContain('allocation_mode');
  });
});
