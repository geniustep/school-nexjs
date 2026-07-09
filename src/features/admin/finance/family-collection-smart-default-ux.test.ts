import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildFamilyChildAllocationLines,
  buildFamilyCompactChildSummaries,
  isPartialFamilyAllocation,
  redistributeChildInstallmentAllocations,
  resolveFamilyCollectionConfirmState,
} from '@/features/admin/finance/family-collection-allocation-utils';
import { buildSuggestedFamilyAllocations } from '@/features/admin/finance/family-suggested-allocation-utils';
import type { FamilyOpenInstallment } from '@/types/family-finance';

const workflowSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-workflow-form.tsx'),
  'utf8',
);
const smartSummarySource = readFileSync(
  resolve('src/features/admin/finance/family-collection-smart-summary.tsx'),
  'utf8',
);
const manualEditorSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-manual-editor.tsx'),
  'utf8',
);
const receiptSource = readFileSync(
  resolve('src/features/admin/finance/receipt-detail-view.tsx'),
  'utf8',
);

const installments: FamilyOpenInstallment[] = [
  {
    installment_id: 1,
    student_id: 10,
    student_name: 'Ayoub',
    service_label: 'Registration',
    service_type: 'registration',
    remaining_amount: 2000,
    suggestion_order: 0,
  },
  {
    installment_id: 2,
    student_id: 10,
    student_name: 'Ayoub',
    service_label: 'Tuition January',
    service_type: 'tuition',
    remaining_amount: 1000,
    suggestion_order: 1,
  },
  {
    installment_id: 3,
    student_id: 11,
    student_name: 'Malak',
    service_label: 'Tuition January',
    service_type: 'tuition',
    remaining_amount: 2000,
    suggestion_order: 2,
  },
  {
    installment_id: 4,
    student_id: 12,
    student_name: 'Doaa',
    service_label: 'Tuition February',
    service_type: 'tuition',
    remaining_amount: 2000,
    suggestion_order: 3,
  },
];

describe('family collection smart default direct confirm UX', () => {
  it('A. removes suggest allocation button from primary flow', () => {
    expect(workflowSource).not.toContain('suggestAllocationAction');
    expect(workflowSource).not.toContain('applySuggestedAllocation');
  });

  it('B. builds provisional allocation automatically in memory', () => {
    expect(workflowSource).toContain("allocationSource !== 'auto'");
    expect(workflowSource).toContain('buildSuggestedFamilyAllocations');
    expect(workflowSource).toContain('setAllocationInputs(suggested)');
    const suggested = buildSuggestedFamilyAllocations({ amount: 6000, installments });
    expect(Object.keys(suggested).length).toBeGreaterThan(0);
  });

  it('C. does not POST when amount changes', () => {
    expect(workflowSource).not.toContain('previewFamilyCollectionAllocation');
    expect(workflowSource).not.toContain('runPreview');
    expect(workflowSource).not.toMatch(/onAmountChange[\s\S]*previewFamilyCollectionAllocation/);
    expect(workflowSource).not.toMatch(/onAmountChange[\s\S]*submitFamilyCollection/);
  });

  it('D. uses compact child cards without installment table in primary flow', () => {
    expect(workflowSource).toContain('FamilyCollectionSmartSummary');
    expect(workflowSource).not.toContain('FamilyCollectionAllocationSection');
    expect(workflowSource).not.toContain('FamilyCollectionReviewStep');
    expect(smartSummarySource).toContain('finance-family-smart-summary__card');
    expect(smartSummarySource).not.toContain('DataTable');
  });

  it('E. child detail shows only allocated lines', () => {
    const lines = buildFamilyChildAllocationLines({
      installments,
      allocationInputs: { 1: '2000', 2: '500' },
      studentId: 10,
    });
    expect(lines).toHaveLength(2);
    expect(lines.every((line) => line.allocatedAmount > 0)).toBe(true);
  });

  it('F. manual editor level 1 shows children totals only', () => {
    expect(manualEditorSource).toContain('finance-family-manual-editor__child-shares');
    expect(manualEditorSource).toContain('manualEditor.childrenHint');
    expect(manualEditorSource).not.toContain('finance-family-allocation-filters');
  });

  it('G. child-level editor shows one child installments only', () => {
    expect(manualEditorSource).toContain("level === 'child-detail'");
    expect(manualEditorSource).toContain('selectedChildInstallments.map');
    expect(manualEditorSource).toContain('selectedStudentId');
  });

  it('H. direct confirm persists draft then confirms', () => {
    expect(workflowSource).toContain('if (collectionId == null)');
    expect(workflowSource).toContain('const saved = await persistDraft()');
    expect(workflowSource).toContain('confirmFamilyCollection');
    expect(workflowSource).toContain('resolveFamilyCollectionReceiptId');
    expect(workflowSource).not.toContain("step === 'review'");
  });

  it('I. actual_payer_name sent when provided', () => {
    expect(workflowSource).toContain('actualPayerName');
    expect(workflowSource).toContain('payload.actual_payer_name = trimmedPayer');
  });

  it('J. actual payer omitted when empty', () => {
    expect(workflowSource).toContain('actualPayerName.trim()');
    expect(workflowSource).toMatch(/if \(trimmedPayer\) \{[\s\S]*actual_payer_name/);
  });

  it('K. partial line shows remaining after payment', () => {
    expect(isPartialFamilyAllocation(500, 2000)).toBe(true);
    expect(smartSummarySource).toContain('smartSummary.remainingAfter');
    expect(smartSummarySource).toContain('line.isPartial');
  });

  it('L. supplier/vendor absent from school receipt UI', () => {
    expect(receiptSource).not.toContain('supplier');
    expect(receiptSource).not.toContain('vendor');
  });

  it('M. unallocated does not block confirm when allowed', () => {
    const state = resolveFamilyCollectionConfirmState({
      parsedAmount: 6000,
      journalId: '1',
      paymentMethod: 'cash',
      academicYearId: '2',
      collectionDate: '2026-07-09',
      cashSessionBlocked: false,
      allocationInputs: buildSuggestedFamilyAllocations({ amount: 3000, installments }),
      installments,
    });
    expect(state.canConfirm).toBe(true);
  });

  it('N. manual overrides survive via allocationSource manual', () => {
    expect(workflowSource).toContain("setAllocationSource('manual')");
    expect(workflowSource).toContain("allocationSource !== 'auto'");
  });

  it('O. suggestion_order remains backend source of truth', () => {
    const suggested = buildSuggestedFamilyAllocations({ amount: 2500, installments });
    expect(suggested['1']).toBe('2000');
    expect(suggested['2']).toBe('500');
    const redistributed = redistributeChildInstallmentAllocations({
      studentId: 10,
      childShare: 2500,
      installments,
      currentInputs: {},
    });
    expect(redistributed['1']).toBe('2000');
    expect(redistributed['2']).toBe('500');
  });
});

describe('compact child summaries', () => {
  it('groups allocated children with service lines', () => {
    const summaries = buildFamilyCompactChildSummaries({
      installments,
      allocationInputs: buildSuggestedFamilyAllocations({ amount: 6000, installments }),
    });
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries.every((summary) => summary.allocatedTotal > 0)).toBe(true);
  });
});
