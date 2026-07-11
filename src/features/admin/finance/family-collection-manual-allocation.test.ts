import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  allocateAvailableToChild,
  buildSuggestedFamilyAllocations,
  clearInstallmentAllocation,
  compareSuggestionCandidates,
  computeChildAllocatedNow,
  computeChildOpenTotal,
  computeChildRemainingAfter,
  countChildAllocatedLines,
  computeFamilyAvailableAmount,
  fillInstallmentAllocation,
  getSuggestionPriority,
  hasActiveFamilyAllocations,
  hasUnsavedFamilyCollectionChanges,
  matchesFamilyInstallmentFilter,
  parseFamilyAllocationInputs,
  sumFamilyAllocationAmounts,
  validateFamilyAllocations,
} from '@/features/admin/finance/family-collection-allocation-utils';
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
const allocationSectionSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-allocation-section.tsx'),
  'utf8',
);
const reviewStepSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-review-step.tsx'),
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

  it('confirms directly from smart summary without separate review step', () => {
    expect(workflowSource).toContain('FamilyCollectionSmartSummary');
    expect(workflowSource).toContain('FamilyCollectionReviewStep');
    expect(workflowSource).not.toContain("setStep('review')");
    expect(workflowSource).toContain('confirmFamilyCollection');
    expect(workflowSource).toContain('resolveFamilyCollectionReceiptId');
  });
});

describe('family collection quick actions', () => {
  it('fill remaining fills only the target line', () => {
    const values = { 22: '1000' };
    const next = fillInstallmentAllocation(childAInstallments[0], 5000, values);
    expect(next[10]).toBe('2500');
    expect(next[22]).toBe('1000');
  });

  it('fill remaining respects installment remaining and available collection amount', () => {
    const values = { 10: '2000', 11: '500' };
    const next = fillInstallmentAllocation(childAInstallments[1], 3000, values);
    expect(next[11]).toBe('1000');
    expect(computeFamilyAvailableAmount(3000, next)).toBe(0);
  });

  it('clear line removes only the target allocation', () => {
    const values = { 10: '2500', 11: '500' };
    const next = clearInstallmentAllocation(values, 10);
    expect(next[10]).toBeUndefined();
    expect(next[11]).toBe('500');
  });

  it('child action allocates only within that child rows in list order', () => {
    const next = allocateAvailableToChild(childAInstallments, 3000, {});
    expect(next[10]).toBe('2500');
    expect(next[11]).toBe('500');
    expect(next[22]).toBeUndefined();
  });

  it('child action does not modify another child allocations', () => {
    const values = { 22: '1500' };
    const next = allocateAvailableToChild(childAInstallments, 5000, values);
    expect(next[22]).toBe('1500');
    expect(next[10]).toBe('2500');
    expect(next[11]).toBe('1000');
  });
});

describe('family collection summaries and filters', () => {
  it('computes child subtotal from visible rows and current inputs', () => {
    const values = { 10: '2500', 11: '500' };
    const openTotal = computeChildOpenTotal(childAInstallments);
    const allocatedNow = computeChildAllocatedNow(childAInstallments, values);
    expect(openTotal).toBe(4500);
    expect(allocatedNow).toBe(3000);
    expect(computeChildRemainingAfter(openTotal, allocatedNow)).toBe(1500);
  });

  it('family summary totals include filtered-out rows with allocations', () => {
    const values = { 10: '2500', 22: '1500' };
    expect(
      matchesFamilyInstallmentFilter(childAInstallments[0], 'tuition', values),
    ).toBe(false);
    expect(sumFamilyAllocationAmounts(values)).toBe(4000);
  });

  it('detects unsaved changes before draft save', () => {
    expect(
      hasUnsavedFamilyCollectionChanges({
        amount: '5000',
        values: { 10: '2500' },
        draftId: null,
      }),
    ).toBe(true);
    expect(
      hasUnsavedFamilyCollectionChanges({
        amount: '',
        values: {},
        draftId: 99,
      }),
    ).toBe(false);
  });
});

describe('family collection workflow state', () => {
  it('preserves inputs when returning from review', () => {
    expect(workflowSource).toContain('onBackToEdit={() => setStep(\'edit\')}');
    expect(workflowSource).toContain('setAllocationInputs');
    expect(workflowSource).not.toMatch(/setStep\('edit'\)[\s\S]*setAllocationInputs\(\{\}\)/);
  });

  it('shows unallocated warning without blocking confirm', () => {
    expect(reviewStepSource).toContain('unallocatedWarningTitle');
    expect(workflowSource).toContain('disabled={confirming || !previewValid');
    expect(workflowSource).not.toMatch(/disabled=\{[^}]*unallocated/);
  });

  it('guards exit with unsaved allocation warning', () => {
    expect(workflowSource).toContain('hasUnsavedFamilyCollectionChanges');
    expect(workflowSource).toContain('unsavedExitWarning');
    expect(workflowSource).toContain('window.confirm');
  });

  it('does not change individual collection workflow', () => {
    expect(individualWorkflowSource).toContain('autoAllocateOldest');
    expect(individualWorkflowSource).not.toContain('FamilyCollectionAllocationSection');
  });
});

const TODAY = '2026-07-09';

const suggestionInstallments: FamilyOpenInstallment[] = [
  {
    installment_id: 1,
    student_id: 1,
    service_type: 'tuition',
    remaining_amount: 2000,
    due_date: '2026-08-01',
  },
  {
    installment_id: 2,
    student_id: 1,
    service_type: 'registration',
    remaining_amount: 2500,
    due_date: '2026-06-01',
  },
  {
    installment_id: 3,
    student_id: 2,
    service_type: 'tuition',
    remaining_amount: 1500,
    due_date: '2026-05-01',
    is_overdue: true,
  },
  {
    installment_id: 4,
    student_id: 2,
    service_type: 'tuition',
    remaining_amount: 1000,
    due_date: '2026-07-01',
    is_overdue: true,
  },
  {
    installment_id: 5,
    student_id: 2,
    service_type: 'transport',
    remaining_amount: 800,
    due_date: '2026-07-05',
  },
];

describe('family collection suggested allocation', () => {
  it('does not suggest on mount', () => {
    const effectBlocks = workflowSource.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/g) ?? [];
    for (const block of effectBlocks) {
      expect(block).not.toContain('buildSuggestedFamilyAllocations');
    }
    expect(workflowSource).toContain('handleSuggestAllocation');
  });

  it('suggests registration before tuition', () => {
    const rows: FamilyOpenInstallment[] = [
      {
        installment_id: 1,
        student_id: 1,
        service_type: 'tuition',
        remaining_amount: 2000,
        due_date: '2026-07-01',
      },
      {
        installment_id: 2,
        student_id: 1,
        service_type: 'registration',
        remaining_amount: 2500,
        due_date: '2026-06-01',
      },
    ];
    const suggested = buildSuggestedFamilyAllocations(rows, 3000, TODAY);
    expect(suggested[2]).toBe('2500');
    expect(suggested[1]).toBe('500');
    expect(getSuggestionPriority(rows[1], TODAY)).toBe(1);
    expect(getSuggestionPriority(rows[0], TODAY)).toBe(3);
  });

  it('suggests older overdue before newer overdue after registration', () => {
    const withoutRegistration = suggestionInstallments.filter((row) => row.installment_id !== 2);
    const suggested = buildSuggestedFamilyAllocations(withoutRegistration, 4000, TODAY);
    expect(Number(suggested[3])).toBe(1500);
    expect(Number(suggested[4])).toBe(1000);
    expect(
      compareSuggestionCandidates(
        withoutRegistration.find((row) => row.installment_id === 3)!,
        withoutRegistration.find((row) => row.installment_id === 4)!,
        TODAY,
      ),
    ).toBeLessThan(0);
  });

  it('never exceeds installment remaining', () => {
    const suggested = buildSuggestedFamilyAllocations(suggestionInstallments, 10000, TODAY);
    for (const row of suggestionInstallments) {
      const amount = Number(suggested[row.installment_id] ?? 0);
      expect(amount).toBeLessThanOrEqual(row.remaining_amount ?? 0);
    }
  });

  it('never exceeds collection amount', () => {
    const suggested = buildSuggestedFamilyAllocations(suggestionInstallments, 4200, TODAY);
    expect(sumFamilyAllocationAmounts(suggested)).toBe(4200);
  });

  it('allows partial allocation on the last installment', () => {
    const suggested = buildSuggestedFamilyAllocations(suggestionInstallments, 3200, TODAY);
    expect(suggested[2]).toBe('2500');
    expect(suggested[3]).toBe('700');
    expect(suggested[4]).toBeUndefined();
  });

  it('is deterministic for the same data', () => {
    const first = buildSuggestedFamilyAllocations(suggestionInstallments, 5000, TODAY);
    const second = buildSuggestedFamilyAllocations(suggestionInstallments, 5000, TODAY);
    expect(first).toEqual(second);
  });

  it('requires confirmation before replacing manual inputs', () => {
    expect(workflowSource).toContain('hasActiveFamilyAllocations(allocationInputs)');
    expect(workflowSource).toContain('replaceSuggestionConfirm');
    expect(workflowSource).toContain('window.confirm');
  });

  it('keeps suggestion editable after apply', () => {
    expect(allocationSectionSource).toContain('FinanceAmountInput');
    expect(allocationSectionSource).toContain('clearInstallmentAllocation');
    expect(workflowSource).toContain('setSuggestionApplied(false)');
  });

  it('computes collapsed child summary correctly', () => {
    const values = { 10: '2500', 11: '500' };
    expect(countChildAllocatedLines(childAInstallments, values)).toBe(2);
    expect(computeChildAllocatedNow(childAInstallments, values)).toBe(3000);
  });

  it('keeps family totals inclusive when children are collapsed', () => {
    const values = { 10: '2500', 11: '500', 22: '1500' };
    expect(sumFamilyAllocationAmounts(values)).toBe(4500);
    expect(hasActiveFamilyAllocations(values)).toBe(true);
  });

  it('allows manual-only workflow without suggestion button press', () => {
    expect(workflowSource).toContain('suggestAllocationAction');
    expect(workflowSource).toContain('FamilyCollectionAllocationSection');
    expect((workflowSource.match(/buildSuggestedFamilyAllocations\(/g) ?? []).length).toBe(1);
  });
});
