import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const apiSource = readFileSync(
  resolve('src/features/admin/student-finance/api/family-finance-api.ts'),
  'utf8',
);
const endpointsSource = readFileSync(resolve('src/lib/api/endpoints.ts'), 'utf8');
const workflowSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-workflow-form.tsx'),
  'utf8',
);
const individualSource = readFileSync(
  resolve('src/features/admin/finance/collection-workflow-form.tsx'),
  'utf8',
);

describe('family collection contract alignment', () => {
  it('confirms via payment-collections/{id}/confirm', () => {
    expect(apiSource).toContain('endpoints.admin.financePaymentCollectionConfirm(collectionId)');
    expect(apiSource).not.toContain('financeFamilyCollectionConfirm');
    expect(endpointsSource).not.toContain('financeFamilyCollectionConfirm');
  });

  it('sends idempotency_key when creating a family draft', () => {
    expect(workflowSource).toContain('idempotency_key: ensureIdempotencyKey()');
    expect(workflowSource).toContain('idempotencyKeyRef');
  });

  it('requires explicit allocation disposition on draft payload', () => {
    expect(workflowSource).toContain('buildFamilyCollectionDraftAllocationFields');
    expect(workflowSource).toContain('allocation_mode');
    expect(workflowSource).toContain('leave_as_family_credit');
    expect(workflowSource).not.toMatch(
      /allocations:\s*parseFamilyAllocationInputs\(sanitizedInputs\)/,
    );
  });

  it('keeps the same idempotency key across retries for one create attempt', () => {
    expect(workflowSource).toMatch(/if \(!idempotencyKeyRef\.current\)/);
    expect(workflowSource).toContain('return idempotencyKeyRef.current');
  });

  it('resolves receipt via payment-collections receipt endpoint when needed', () => {
    expect(workflowSource).toContain('resolveFamilyCollectionReceiptId');
    expect(workflowSource).toContain('fetchCollectionReceipt');
    expect(workflowSource).toContain('issueCollectionReceipt');
  });

  it('navigates to receipt page after confirm success', () => {
    const drawerSource = readFileSync(
      resolve('src/features/admin/finance/family-collection-drawer.tsx'),
      'utf8',
    );
    expect(drawerSource).toContain('/admin/finance/receipts/${receiptId}');
  });

  it('does not change individual collection confirm endpoint', () => {
    expect(individualSource).toContain('financePaymentCollections');
    expect(individualSource).toContain('ensureIdempotencyKey');
  });
});
