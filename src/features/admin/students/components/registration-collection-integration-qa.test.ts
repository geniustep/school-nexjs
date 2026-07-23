import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  resolve('src/features/admin/students/components/family-registration-page.tsx'),
  'utf8',
);
const entrySource = readFileSync(
  resolve('src/features/admin/students/components/registration-post-create-collection-entry.tsx'),
  'utf8',
);
const studentDrawerSource = readFileSync(
  resolve('src/features/admin/finance/student-collection-drawer.tsx'),
  'utf8',
);
const familyDrawerSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-drawer.tsx'),
  'utf8',
);
const workflowSource = readFileSync(
  resolve('src/features/admin/finance/collection-workflow-form.tsx'),
  'utf8',
);

describe('post-enrollment collection wiring — Integration QA contracts', () => {
  it('family result wires collection only from succeeded student ids', () => {
    expect(pageSource).toContain('RegistrationPostCreateCollectionEntry');
    expect(pageSource).toContain("row.status === 'succeeded'");
    expect(pageSource).toContain('succeededCollectionStudentIds');
    expect(pageSource).toContain('family-registration-retry-failed');
  });

  it('keeps collection optional and gated by finance.collect_payments only', () => {
    const financePerms = readFileSync(resolve('src/lib/permissions/finance.ts'), 'utf8');
    expect(entrySource).toContain('canCollectPayments');
    expect(financePerms).toContain("FINANCE_COLLECT: Permission = 'finance.collect_payments'");
    expect(financePerms).toContain('export function canCollectPayments');
    expect(entrySource).not.toContain('canCreateStudents');
    expect(entrySource).toContain('optionalHint');
  });

  it('reuses official drawers without leaving family result on success', () => {
    expect(entrySource).toContain('StudentCollectionDrawer');
    expect(entrySource).toContain('FamilyCollectionDrawer');
    expect(entrySource).toContain('navigateToReceiptOnSuccess={false}');
    expect(familyDrawerSource).toContain('navigateToReceiptOnSuccess');
  });

  it('keeps official double-submit and idempotency guards in collection workflow', () => {
    expect(workflowSource).toContain('if (submitting) return');
    expect(workflowSource).toContain('idempotencyKeyRef');
    expect(studentDrawerSource).toContain('handledCollectionIdRef');
    expect(familyDrawerSource).toContain('handledRef');
  });
});
