import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseFamilyAllocationInputs,
  sumFamilyAllocationAmounts,
  validateFamilyAllocations,
} from '@/features/admin/finance/family-collection-allocation-utils';

const studentEntrySource = readFileSync(
  resolve('src/features/admin/student-finance/components/student-360-payment-entry.tsx'),
  'utf8',
);
const billingAccountSource = readFileSync(
  resolve('src/app/admin/finance/billing-accounts/[billingPartnerId]/page.tsx'),
  'utf8',
);
const workflowSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-workflow-form.tsx'),
  'utf8',
);

describe('family collection shared entry points', () => {
  it('opens shared family workflow from Student 360', () => {
    expect(studentEntrySource).toContain('FamilyCollectionDrawer');
    expect(studentEntrySource).toContain('entrySource="student360"');
  });

  it('opens same shared family workflow from billing account page', () => {
    expect(billingAccountSource).toContain('FamilyCollectionDrawer');
    expect(billingAccountSource).toContain('family_collect');
  });
});

describe('manual family allocations', () => {
  it('computes allocated/unallocated totals from explicit inputs', () => {
    const values = { 10: '2500', 11: '500', 22: '1500' };
    expect(sumFamilyAllocationAmounts(values)).toBe(4500);
    expect(5000 - sumFamilyAllocationAmounts(values)).toBe(500);
  });

  it('builds payload with installment_id and amount only', () => {
    expect(parseFamilyAllocationInputs({ 10: '2500', 11: '500' })).toEqual([
      { installment_id: 10, amount: 2500 },
      { installment_id: 11, amount: 500 },
    ]);
  });

  it('rejects amount exceeding installment remaining', () => {
    const code = validateFamilyAllocations({
      amount: 5000,
      values: { 10: '2600' },
      installments: [
        { installment_id: 10, student_id: 1, remaining_amount: 2500 },
      ],
    });
    expect(code).toBe('allocation_exceeds_remaining');
  });

  it('has no client-side auto-allocation for family flow', () => {
    expect(workflowSource).not.toContain('autoAllocateOldest');
    expect(workflowSource).toContain('parseFamilyAllocationInputs');
  });

  it('renders review step grouped by student before confirm', () => {
    expect(workflowSource).toContain('FamilyCollectionReviewStep');
    expect(workflowSource).toContain("setStep('review')");
    expect(workflowSource).toContain('confirmFamilyCollection');
    expect(workflowSource).toContain('resolveFamilyCollectionReceiptId');
  });
});
