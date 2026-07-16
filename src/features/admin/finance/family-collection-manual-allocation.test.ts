import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyChildShareTotals,
  buildFamilyStudentAllocationSummaries,
  clearChildAllocations,
  fillChildRemainingShare,
  filterFamilyInstallments,
  hasActiveFamilyAllocations,
  parseFamilyAllocationInputs,
  sumFamilyAllocationAmounts,
  validateFamilyAllocations,
} from '@/features/admin/finance/family-collection-allocation-utils';
import { buildSuggestedFamilyAllocations } from '@/features/admin/finance/family-suggested-allocation-utils';
import type { FamilyOpenInstallment } from '@/types/family-finance';

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
const manualEditorSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-manual-editor.tsx'),
  'utf8',
);
const individualWorkflowSource = readFileSync(
  resolve('src/features/admin/finance/collection-workflow-form.tsx'),
  'utf8',
);

const childAInstallments: FamilyOpenInstallment[] = [
  {
    installment_id: 10,
    student_id: 1,
    student_name: 'Ahmed',
    service_type: 'registration',
    remaining_amount: 2500,
  },
  {
    installment_id: 11,
    student_id: 1,
    student_name: 'Ahmed',
    service_type: 'tuition',
    service_label: 'Tuition — October',
    remaining_amount: 2000,
  },
];

const childBInstallments: FamilyOpenInstallment[] = [
  {
    installment_id: 22,
    student_id: 2,
    student_name: 'Sara',
    service_type: 'tuition',
    remaining_amount: 1500,
  },
];

const allInstallments = [...childAInstallments, ...childBInstallments];

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

  it('uses provisional allocation inputs in direct confirm flow', () => {
    expect(workflowSource).not.toContain('autoAllocateOldest');
    expect(workflowSource).toContain('parseFamilyAllocationInputs');
    expect(workflowSource).toContain('buildSuggestedFamilyAllocations');
  });

  it('keeps smart summary and review step in family workflow', () => {
    expect(workflowSource).toContain('FamilyCollectionSmartSummary');
    expect(workflowSource).toContain('FamilyCollectionReviewStep');
    expect(workflowSource).toContain('confirmFamilyCollection');
  });
});

describe('family collection child share actions', () => {
  it('fill remaining share fills only within the target child', () => {
    const next = fillChildRemainingShare({
      studentId: 1,
      targetShare: 3000,
      installments: allInstallments,
      currentInputs: { 22: '1000' },
    });
    expect(next[10]).toBe('2500');
    expect(next[11]).toBe('500');
    expect(next[22]).toBe('1000');
  });

  it('fill remaining share respects installment remaining amounts', () => {
    const next = fillChildRemainingShare({
      studentId: 1,
      targetShare: 3000,
      installments: allInstallments,
      currentInputs: { 10: '2000', 11: '500' },
    });
    expect(sumFamilyAllocationAmounts({
      10: next[10] ?? '0',
      11: next[11] ?? '0',
    })).toBe(3000);
    expect(Number(next[10] ?? 0)).toBeLessThanOrEqual(2500);
    expect(Number(next[11] ?? 0)).toBeLessThanOrEqual(2000);
  });

  it('clear child allocations removes only that child lines', () => {
    const next = clearChildAllocations({
      studentId: 1,
      installments: allInstallments,
      currentInputs: { 10: '2500', 11: '500', 22: '1500' },
    });
    expect(next[10]).toBeUndefined();
    expect(next[11]).toBeUndefined();
    expect(next[22]).toBe('1500');
  });

  it('apply child share totals redistributes only for provided children', () => {
    const next = applyChildShareTotals({
      shares: { 1: '3000' },
      installments: allInstallments,
      currentInputs: { 22: '1500' },
    });
    expect(next[10]).toBe('2500');
    expect(next[11]).toBe('500');
    expect(next[22]).toBeUndefined();
  });

  it('apply child share totals does not leave other child amounts when clearing all rows first', () => {
    const next = applyChildShareTotals({
      shares: { 1: '4500' },
      installments: allInstallments,
      currentInputs: { 22: '1500' },
    });
    expect(next[22]).toBeUndefined();
    expect(next[10]).toBe('2500');
    expect(next[11]).toBe('2000');
  });
});

describe('family collection summaries and filters', () => {
  it('computes child subtotal from visible rows and current inputs', () => {
    const values = { 10: '2500', 11: '500' };
    const [summary] = buildFamilyStudentAllocationSummaries({
      installments: childAInstallments,
      allocationInputs: values,
    });
    expect(summary.openTotal).toBe(4500);
    expect(summary.allocatedNow).toBe(3000);
    expect(summary.remainingAfter).toBe(1500);
    expect(summary.allocatedItemCount).toBe(2);
  });

  it('family summary totals include filtered-out rows with allocations', () => {
    const values = { 10: '2500', 22: '1500' };
    const tuitionOnly = filterFamilyInstallments(allInstallments, 'tuition', values);
    expect(tuitionOnly.map((row) => row.installment_id)).toEqual([11, 22]);
    expect(sumFamilyAllocationAmounts(values)).toBe(4000);
  });

  it('detects active allocations from current inputs', () => {
    expect(hasActiveFamilyAllocations({ 10: '2500' })).toBe(true);
    expect(hasActiveFamilyAllocations({})).toBe(false);
  });
});

describe('family collection workflow wiring', () => {
  it('keeps editable amount inputs in manual editor', () => {
    expect(manualEditorSource).toContain('FinanceAmountInput');
    expect(manualEditorSource).toContain('fillChildRemainingShare');
    expect(manualEditorSource).toContain('clearChildAllocations');
  });

  it('does not change individual collection workflow', () => {
    expect(individualWorkflowSource).toContain('autoAllocateOldest');
    expect(individualWorkflowSource).not.toContain('FamilyCollectionManualEditor');
  });
});

describe('family collection suggested allocation wiring', () => {
  it('builds suggestions from explicit amount and installments', () => {
    const suggested = buildSuggestedFamilyAllocations({
      amount: 3000,
      installments: [
        {
          installment_id: 1,
          student_id: 1,
          service_type: 'tuition',
          remaining_amount: 2000,
          suggestion_order: 1,
        },
        {
          installment_id: 2,
          student_id: 1,
          service_type: 'registration',
          remaining_amount: 2500,
          suggestion_order: 0,
        },
      ],
    });
    expect(suggested[2]).toBe('2500');
    expect(suggested[1]).toBe('500');
  });

  it('never exceeds installment remaining or collection amount', () => {
    const installments: FamilyOpenInstallment[] = [
      {
        installment_id: 1,
        student_id: 1,
        service_type: 'tuition',
        remaining_amount: 2000,
        suggestion_order: 0,
      },
      {
        installment_id: 2,
        student_id: 1,
        service_type: 'registration',
        remaining_amount: 2500,
        suggestion_order: 1,
      },
    ];
    const suggested = buildSuggestedFamilyAllocations({ amount: 3200, installments });
    expect(sumFamilyAllocationAmounts(suggested)).toBe(3200);
    for (const row of installments) {
      expect(Number(suggested[row.installment_id] ?? 0)).toBeLessThanOrEqual(
        row.remaining_amount ?? 0,
      );
    }
  });

  it('is deterministic for the same data', () => {
    const installments = allInstallments.map((row, index) => ({
      ...row,
      suggestion_order: index,
    }));
    const first = buildSuggestedFamilyAllocations({ amount: 5000, installments });
    const second = buildSuggestedFamilyAllocations({ amount: 5000, installments });
    expect(first).toEqual(second);
  });

  it('gates auto-suggestion behind allocationSource auto and keeps manual editor', () => {
    expect(workflowSource).toContain('buildSuggestedFamilyAllocations');
    expect(workflowSource).toContain("allocationSource !== 'auto'");
    expect(workflowSource).toContain('FamilyCollectionManualEditor');
    expect(workflowSource).toContain("setAllocationSource('manual')");
  });
});
