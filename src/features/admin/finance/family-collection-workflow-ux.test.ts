import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildFamilyStudentAllocationSummaries,
  familyCollectionConfirmBlockReasonKey,
  filterFamilyInstallments,
  hasActiveFamilyAllocations,
  resolveDefaultExpandedStudentIds,
  resolveFamilyCollectionConfirmState,
} from '@/features/admin/finance/family-collection-allocation-utils';

const LOCALES = ['ar', 'en', 'fr', 'es'] as const;

const UX_I18N_KEYS = [
  'editAllocationAction',
  'actualPayerName',
  'actualPayerHint',
  'headerSummaryTitle',
  'smartSummary.title',
  'smartSummary.explainability',
  'smartSummary.showDetails',
  'manualEditor.title',
  'manualEditor.childrenHint',
  'confirmBlockReason.invalid_allocations',
  'confirmBlockReason.missing_fields',
] as const;

const workflowSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-workflow-form.tsx'),
  'utf8',
);
const smartSummarySource = readFileSync(
  resolve('src/features/admin/finance/family-collection-smart-summary.tsx'),
  'utf8',
);

function readNested(messages: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, messages);
}

describe('family collection workflow UX i18n', () => {
  for (const locale of LOCALES) {
    it(`defines UX keys for ${locale}`, () => {
      const messages = JSON.parse(readFileSync(resolve(`messages/${locale}.json`), 'utf8')) as {
        admin?: { finance?: { billingAccounts?: { familyCollection?: Record<string, unknown> } } };
      };
      const familyCollection = messages.admin?.finance?.billingAccounts?.familyCollection;
      expect(familyCollection).toBeTruthy();
      for (const key of UX_I18N_KEYS) {
        const value = readNested(familyCollection as Record<string, unknown>, key);
        expect(typeof value, `${locale}.familyCollection.${key}`).toBe('string');
        expect((value as string).trim().length).toBeGreaterThan(0);
        expect(value as string).not.toMatch(/^admin\./);
      }
    });
  }
});

describe('family collection workflow layout', () => {
  it('uses header summary and smart summary step hint', () => {
    expect(workflowSource).toContain('finance-family-collection-header-summary');
    expect(workflowSource).toContain('stepHintSmartSummary');
    expect(workflowSource).toContain('FamilyCollectionSmartSummary');
  });

  it('shows child cards with on-demand details only', () => {
    expect(smartSummarySource).toContain('finance-family-smart-summary__card');
    expect(smartSummarySource).toContain('expandedStudentIds.has(summary.studentId)');
    expect(smartSummarySource).toContain('finance-family-smart-summary__card-details');
  });
});

describe('family collection confirm button state', () => {
  it('allows direct confirm with valid provisional allocation state', () => {
    const state = resolveFamilyCollectionConfirmState({
      parsedAmount: 5000,
      journalId: '1',
      paymentMethod: 'cash',
      academicYearId: '2',
      collectionDate: '2026-07-09',
      cashSessionBlocked: false,
      allocationInputs: { 1: '500' },
      installments: [
        {
          installment_id: 1,
          student_id: 10,
          remaining_amount: 1000,
        },
      ],
    });
    expect(state.canConfirm).toBe(true);
    expect(state.blockReason).toBeNull();
  });

  it('does not block confirm because of unallocated amount', () => {
    const state = resolveFamilyCollectionConfirmState({
      parsedAmount: 5000,
      journalId: '1',
      paymentMethod: 'cash',
      academicYearId: '2',
      collectionDate: '2026-07-09',
      cashSessionBlocked: false,
      allocationInputs: { 1: '500' },
      installments: [
        {
          installment_id: 1,
          student_id: 10,
          remaining_amount: 1000,
        },
      ],
    });
    expect(state.canConfirm).toBe(true);
  });

  it('shows block reason when allocations are invalid', () => {
    const state = resolveFamilyCollectionConfirmState({
      parsedAmount: 5000,
      journalId: '1',
      paymentMethod: 'cash',
      academicYearId: '2',
      collectionDate: '2026-07-09',
      cashSessionBlocked: false,
      allocationInputs: { 1: '6000' },
      installments: [
        {
          installment_id: 1,
          student_id: 10,
          remaining_amount: 1000,
        },
      ],
    });
    expect(state.canConfirm).toBe(false);
    expect(state.blockReason).toBe('invalid_allocations');
    expect(familyCollectionConfirmBlockReasonKey(state.blockReason!)).toBe(
      'admin.finance.billingAccounts.familyCollection.confirmBlockReason.invalid_allocations',
    );
  });

  it('auto-persists draft on confirm when draft id is missing', () => {
    expect(workflowSource).toContain('if (collectionId == null)');
    expect(workflowSource).toContain('const saved = await persistDraft()');
    expect(workflowSource).toContain('disabled={confirming || !confirmState.canConfirm}');
  });

  it('uses direct confirm footer actions', () => {
    expect(workflowSource).toContain('editAllocationAction');
    expect(workflowSource).toContain('confirmAction');
    expect(workflowSource).not.toContain('reviewAction');
  });
});

describe('family collection collapse and filters behavior', () => {
  const installments = [
    {
      installment_id: 1,
      student_id: 10,
      student_name: 'Ali',
      service_type: 'tuition',
      remaining_amount: 2000,
      is_overdue: true,
    },
    {
      installment_id: 2,
      student_id: 11,
      student_name: 'Sara',
      service_type: 'registration',
      remaining_amount: 1000,
      is_overdue: false,
    },
  ] as const;

  it('defaults children collapsed except highlighted or allocated students', () => {
    const summaries = buildFamilyStudentAllocationSummaries({
      installments: [...installments],
      allocationInputs: { 1: '500' },
    });
    const expanded = resolveDefaultExpandedStudentIds({
      summaries,
      highlightStudentId: undefined,
    });
    expect(expanded.has(10)).toBe(true);
    expect(expanded.has(11)).toBe(false);
  });

  it('filters installments by tuition and overdue', () => {
    expect(
      filterFamilyInstallments([...installments], 'tuition', {}).map((row) => row.installment_id),
    ).toEqual([1]);
    expect(
      filterFamilyInstallments([...installments], 'overdue', {}).map((row) => row.installment_id),
    ).toEqual([1]);
    expect(
      filterFamilyInstallments([...installments], 'unallocated', { 1: '500' }).map(
        (row) => row.installment_id,
      ),
    ).toEqual([2]);
  });

  it('preserves manual allocation state helpers', () => {
    expect(hasActiveFamilyAllocations({ 1: '500' })).toBe(true);
    expect(hasActiveFamilyAllocations({ 1: '0', 2: '' })).toBe(false);
  });
});
