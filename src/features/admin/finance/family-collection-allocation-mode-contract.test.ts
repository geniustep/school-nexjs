import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildFamilyCollectionDraftAllocationFields,
  resolveFamilyCollectionConfirmState,
  resolveFamilyCollectionDispositionFromDraft,
  sanitizeFamilyAllocationInputs,
} from '@/features/admin/finance/family-collection-allocation-utils';

const LOCALES = ['ar', 'en', 'fr', 'es'] as const;

const DISPOSITION_I18N_KEYS = [
  'dispositionMode.title',
  'dispositionMode.allocate',
  'dispositionMode.allocateHint',
  'dispositionMode.leaveAsCredit',
  'dispositionMode.leaveAsCreditHint',
  'dispositionMode.leaveAsCreditSummary',
  'dispositionMode.required',
  'dispositionMode.emptyAllocations',
  'dispositionMode.noEligibleInstallments',
] as const;

const workflowSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-workflow-form.tsx'),
  'utf8',
);
const apiSource = readFileSync(
  resolve('src/features/admin/student-finance/api/family-finance-api.ts'),
  'utf8',
);
const bffSource = readFileSync(resolve('src/app/api/odoo/[...path]/route.ts'), 'utf8');
const typesSource = readFileSync(resolve('src/types/family-finance.ts'), 'utf8');
const previewSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-backend-preview.ts'),
  'utf8',
);
const drawerSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-drawer.tsx'),
  'utf8',
);

const installments = [
  {
    installment_id: 123,
    student_id: 10,
    remaining_amount: 1000,
    collectible: true,
  },
];

function readNested(messages: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, messages);
}

describe('family collection explicit allocation mode contract', () => {
  for (const locale of LOCALES) {
    it(`defines disposition mode i18n for ${locale}`, () => {
      const messages = JSON.parse(readFileSync(resolve(`messages/${locale}.json`), 'utf8')) as {
        admin?: { finance?: { billingAccounts?: { familyCollection?: Record<string, unknown> } } };
      };
      const familyCollection = messages.admin?.finance?.billingAccounts?.familyCollection;
      expect(familyCollection).toBeTruthy();
      for (const key of DISPOSITION_I18N_KEYS) {
        const value = readNested(familyCollection as Record<string, unknown>, key);
        expect(typeof value, `${locale}.${key}`).toBe('string');
        expect((value as string).trim().length).toBeGreaterThan(0);
      }
    });
  }

  it('allocate mode with positive allocation allows payload without leave_as_family_credit', () => {
    const result = buildFamilyCollectionDraftAllocationFields({
      dispositionMode: 'allocate_to_installments',
      allocationInputs: { 123: '500' },
      installments,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fields.allocations).toEqual([{ installment_id: 123, amount: 500 }]);
    expect(result.fields.allocation_mode).toBeUndefined();
  });

  it('allocate mode with empty allocations blocks and does not invent credit mode', () => {
    const result = buildFamilyCollectionDraftAllocationFields({
      dispositionMode: 'allocate_to_installments',
      allocationInputs: {},
      installments,
    });
    expect(result).toEqual({ ok: false, reason: 'empty_allocations' });
  });

  it('allocate mode with all-zero lines after sanitize blocks', () => {
    const sanitized = sanitizeFamilyAllocationInputs({
      values: { 123: '0', 999: '0' },
      installments,
    });
    expect(sanitized).toEqual({});
    const result = buildFamilyCollectionDraftAllocationFields({
      dispositionMode: 'allocate_to_installments',
      allocationInputs: { 123: '0', 999: '' },
      installments,
    });
    expect(result).toEqual({ ok: false, reason: 'empty_allocations' });
  });

  it('allocate mode with invalid empty strings blocks', () => {
    const result = buildFamilyCollectionDraftAllocationFields({
      dispositionMode: 'allocate_to_installments',
      allocationInputs: { 123: '   ' },
      installments,
    });
    expect(result).toEqual({ ok: false, reason: 'empty_allocations' });
  });

  it('leave_as_family_credit allows empty allocations and clears prior positive lines from payload', () => {
    const result = buildFamilyCollectionDraftAllocationFields({
      dispositionMode: 'leave_as_family_credit',
      allocationInputs: { 123: '500', 456: '200' },
      installments,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fields).toEqual({
      allocation_mode: 'leave_as_family_credit',
      allocations: [],
    });
  });

  it('missing disposition mode blocks draft and confirm', () => {
    const draft = buildFamilyCollectionDraftAllocationFields({
      dispositionMode: null,
      allocationInputs: { 123: '500' },
      installments,
    });
    expect(draft).toEqual({ ok: false, reason: 'allocation_mode_required' });

    const confirm = resolveFamilyCollectionConfirmState({
      parsedAmount: 500,
      journalId: '1',
      paymentMethod: 'cash',
      academicYearId: '2',
      collectionDate: '2026-07-23',
      cashSessionBlocked: false,
      allocationInputs: { 123: '500' },
      installments,
      dispositionMode: null,
      hasCollectibleInstallments: true,
    });
    expect(confirm.canConfirm).toBe(false);
    expect(confirm.blockReason).toBe('allocation_mode_required');
  });

  it('no collectible installments keeps credit available without auto-selecting it', () => {
    const confirmUnset = resolveFamilyCollectionConfirmState({
      parsedAmount: 500,
      journalId: '1',
      paymentMethod: 'cash',
      academicYearId: '2',
      collectionDate: '2026-07-23',
      cashSessionBlocked: false,
      allocationInputs: {},
      installments: [],
      dispositionMode: null,
      hasCollectibleInstallments: false,
    });
    expect(confirmUnset.canConfirm).toBe(false);
    expect(confirmUnset.blockReason).toBe('allocation_mode_required');

    const confirmCredit = resolveFamilyCollectionConfirmState({
      parsedAmount: 500,
      journalId: '1',
      paymentMethod: 'cash',
      academicYearId: '2',
      collectionDate: '2026-07-23',
      cashSessionBlocked: false,
      allocationInputs: {},
      installments: [],
      dispositionMode: 'leave_as_family_credit',
      hasCollectibleInstallments: false,
    });
    expect(confirmCredit.canConfirm).toBe(true);

    expect(workflowSource).toContain('disabled={collectibleInstallments.length === 0}');
    expect(workflowSource).toContain('noEligibleInstallments');
    expect(workflowSource).toContain('useState<FamilyCollectionDispositionMode | null>');
    expect(workflowSource).toContain('setDispositionMode(null)');
    expect(workflowSource).toContain('}, [familyId]);');
  });

  it('switching allocate → credit drops allocations from payload', () => {
    const allocate = buildFamilyCollectionDraftAllocationFields({
      dispositionMode: 'allocate_to_installments',
      allocationInputs: { 123: '500' },
      installments,
    });
    expect(allocate.ok).toBe(true);

    const credit = buildFamilyCollectionDraftAllocationFields({
      dispositionMode: 'leave_as_family_credit',
      allocationInputs: { 123: '500' },
      installments,
    });
    expect(credit.ok).toBe(true);
    if (!credit.ok) return;
    expect(credit.fields.allocations).toEqual([]);
    expect(credit.fields.allocation_mode).toBe('leave_as_family_credit');
  });

  it('switching credit → allocate restores allocation validation and drops mode', () => {
    const credit = buildFamilyCollectionDraftAllocationFields({
      dispositionMode: 'leave_as_family_credit',
      allocationInputs: {},
      installments,
    });
    expect(credit.ok).toBe(true);
    if (credit.ok) {
      expect(credit.fields.allocation_mode).toBe('leave_as_family_credit');
    }

    const allocateEmpty = buildFamilyCollectionDraftAllocationFields({
      dispositionMode: 'allocate_to_installments',
      allocationInputs: {},
      installments,
    });
    expect(allocateEmpty).toEqual({ ok: false, reason: 'empty_allocations' });

    const allocateOk = buildFamilyCollectionDraftAllocationFields({
      dispositionMode: 'allocate_to_installments',
      allocationInputs: { 123: '100' },
      installments,
    });
    expect(allocateOk.ok).toBe(true);
    if (!allocateOk.ok) return;
    expect(allocateOk.fields.allocation_mode).toBeUndefined();
  });

  it('save draft and confirm share the same allocation builder', () => {
    expect(workflowSource).toContain('buildFamilyCollectionDraftAllocationFields');
    expect(workflowSource).toMatch(/async function handleSaveDraft[\s\S]*buildFamilyCollectionDraftAllocationFields/);
    expect(workflowSource).toMatch(/async function handleConfirm[\s\S]*buildFamilyCollectionDraftAllocationFields/);
    expect(workflowSource).toContain('buildDraftPayload');
  });

  it('BFF forwards JSON body without inventing leave_as_family_credit', () => {
    expect(bffSource).toContain('body = await request.json()');
    expect(bffSource).toContain('body,');
    expect(bffSource).not.toContain('leave_as_family_credit');
    expect(apiSource).toContain('endpoints.admin.financeFamilyCollections');
    expect(apiSource).toContain('payload');
    expect(typesSource).toContain("allocation_mode?: FamilyCollectionDraftAllocationMode");
    expect(typesSource).toContain("'leave_as_family_credit'");
  });

  it('preview passes leave_as_family_credit without inventing it', () => {
    expect(previewSource).toContain('allocationMode?:');
    expect(previewSource).toContain("allocationMode === 'leave_as_family_credit' ? []");
    expect(previewSource).toContain("const allocationMode = input.allocationMode ?? 'manual'");
  });

  it('guards double-submit on draft and confirm', () => {
    expect(workflowSource).toContain('if (submitting || cashSessionBlocked) return false');
    expect(workflowSource).toContain('if (confirming || previewing || !confirmState.canConfirm) return');
    expect(workflowSource).toContain('disabled={submitting || cashSessionBlocked}');
    expect(workflowSource).toContain(
      'disabled={confirming || previewing || !confirmState.canConfirm}',
    );
  });

  it('keeps form open and shows error path for backend invalid_field without success toast', () => {
    expect(workflowSource).toContain('resolveCollectionErrorMessage');
    expect(workflowSource).toContain("saved.code === 'installment_not_collectible'");
    expect(workflowSource).not.toContain('toast.success');
    expect(drawerSource).toContain('onDone');
  });

  it('resets disposition when family account changes', () => {
    expect(workflowSource).toContain('setDispositionMode(null)');
    expect(workflowSource).toMatch(/useEffect\(\(\) => \{[\s\S]*setDispositionMode\(null\)[\s\S]*\}, \[familyId\]\)/);
    expect(drawerSource).toContain('key={familyId}');
  });

  it('infers disposition only from saved draft contract', () => {
    expect(
      resolveFamilyCollectionDispositionFromDraft({
        allocation_mode: 'leave_as_family_credit',
        allocations: [],
      }),
    ).toBe('leave_as_family_credit');
    expect(
      resolveFamilyCollectionDispositionFromDraft({
        allocations: [{ amount: 200 }],
      }),
    ).toBe('allocate_to_installments');
    expect(
      resolveFamilyCollectionDispositionFromDraft({
        allocations: [],
      }),
    ).toBeNull();
  });

  it('UI exposes explicit radiogroup without auto-selecting credit', () => {
    expect(workflowSource).toContain('role="radiogroup"');
    expect(workflowSource).toContain('allocate_to_installments');
    expect(workflowSource).toContain('leave_as_family_credit');
    expect(workflowSource).toContain('useState<FamilyCollectionDispositionMode | null>(');
    expect(workflowSource).toContain('null');
  });
});
