import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseFamilyAllocationInputs,
  readInstallmentNotCollectibleId,
  resolveFamilyCollectionConfirmState,
  sanitizeFamilyAllocationInputs,
} from '@/features/admin/finance/family-collection-allocation-utils';
import {
  buildChequeRegistrationPayload,
  resolveChequeCollectionReference,
} from '@/features/admin/finance/collection-cheque-payload';
import {
  filterCollectibleFamilyInstallments,
  isInstallmentCollectibleForAllocation,
} from '@/features/admin/finance/family-installment-collectibility';
import { buildSuggestedFamilyAllocations } from '@/features/admin/finance/family-suggested-allocation-utils';
import type { FamilyOpenInstallment } from '@/types/family-finance';

const workflowSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-workflow-form.tsx'),
  'utf8',
);
const quickPaymentSource = readFileSync(
  resolve('src/features/admin/finance/quick-payment-core-fields.tsx'),
  'utf8',
);
const manualEditorSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-manual-editor.tsx'),
  'utf8',
);

const collectible: FamilyOpenInstallment = {
  installment_id: 3339,
  student_id: 10,
  remaining_amount: 500,
  collectible: true,
  suggestion_order: 0,
};

const nonCollectible: FamilyOpenInstallment = {
  installment_id: 1632,
  student_id: 617,
  remaining_amount: 300,
  collectible: false,
  suggestion_order: 2,
};

const installments = [collectible, nonCollectible];

describe('family collection cheque UX', () => {
  it('A. cash flow does not require cheque field props in confirm state', () => {
    const state = resolveFamilyCollectionConfirmState({
      parsedAmount: 100,
      journalId: '1',
      paymentMethod: 'cash',
      academicYearId: '2',
      collectionDate: '2026-07-09',
      cashSessionBlocked: false,
      allocationInputs: { 3339: '100' },
      installments,
      dispositionMode: 'allocate_to_installments',
      hasCollectibleInstallments: true,
      isCheque: false,
    });
    expect(state.canConfirm).toBe(true);
    expect(workflowSource).toContain('chequeValues={chequeValues}');
    expect(workflowSource).toContain('onChequeChange');
  });

  it('B. workflow wires cheque fields through QuickPaymentCoreFields', () => {
    expect(workflowSource).toContain('CollectionChequeFieldValues');
    expect(quickPaymentSource).toContain('CollectionChequeFields');
    expect(workflowSource).toContain('chequeValues={chequeValues}');
  });

  it('B2. workflow wires bank transfer reference through QuickPaymentCoreFields', () => {
    expect(workflowSource).toContain('reference={reference}');
    expect(workflowSource).toContain('onReferenceChange={setReference}');
    expect(workflowSource).toMatch(/else if \(reference\.trim\(\)\)[\s\S]*payload\.reference = reference\.trim\(\)/);
  });

  it('B3. bank transfer without reference blocks confirm', () => {
    const blocked = resolveFamilyCollectionConfirmState({
      parsedAmount: 100,
      journalId: '6',
      paymentMethod: 'bank_transfer',
      academicYearId: '2',
      collectionDate: '2026-07-09',
      cashSessionBlocked: false,
      allocationInputs: { 3339: '100' },
      installments,
      dispositionMode: 'allocate_to_installments',
      hasCollectibleInstallments: true,
      reference: '',
    });
    expect(blocked.canConfirm).toBe(false);
    expect(blocked.blockReason).toBe('payment_reference_required');

    const ok = resolveFamilyCollectionConfirmState({
      parsedAmount: 100,
      journalId: '6',
      paymentMethod: 'bank_transfer',
      academicYearId: '2',
      collectionDate: '2026-07-09',
      cashSessionBlocked: false,
      allocationInputs: { 3339: '100' },
      installments,
      dispositionMode: 'allocate_to_installments',
      hasCollectibleInstallments: true,
      reference: 'TRX-99',
    });
    expect(ok.canConfirm).toBe(true);
    expect(ok.blockReason).toBeNull();
  });

  it('C. cheque payload uses existing registration contract', () => {
    const payload = buildChequeRegistrationPayload({
      chequeNumber: 'CHQ-100',
      chequeBank: 'BMCE',
      chequeHolder: 'Parent Name',
      chequeWrittenDate: '2026-07-09',
      chequePostdated: false,
      chequeDueDate: '',
      collectionDate: '2026-07-09',
    });
    expect(payload).toEqual({
      cheque_number: 'CHQ-100',
      bank_name: 'BMCE',
      holder_name: 'Parent Name',
      received_date: '2026-07-09',
      due_date: '2026-07-09',
    });
    expect(workflowSource).toContain('buildChequeRegistrationPayload');
    expect(workflowSource).toContain('payload.cheque = chequePayload');
    expect(workflowSource).toContain('resolveChequeCollectionReference');
    expect(resolveChequeCollectionReference('CHQ-100')).toBe('CHQ-100');
  });

  it('D. switching away from cheque clears cheque state', () => {
    expect(workflowSource).toMatch(/if \(!isCheque\)[\s\S]*setChequeNumber\(''\)/);
  });

  it('E. missing cheque field blocks confirm with explicit reason', () => {
    const state = resolveFamilyCollectionConfirmState({
      parsedAmount: 100,
      journalId: '6',
      paymentMethod: 'cheque',
      academicYearId: '2',
      collectionDate: '2026-07-09',
      cashSessionBlocked: false,
      allocationInputs: { 3339: '100' },
      installments,
      dispositionMode: 'allocate_to_installments',
      hasCollectibleInstallments: true,
      isCheque: true,
      chequeNumber: '',
      chequeBank: 'Bank',
      chequeHolder: 'Holder',
      chequeWrittenDate: '2026-07-09',
      chequePostdated: false,
      chequeDueDate: '',
    });
    expect(state.canConfirm).toBe(false);
    expect(state.blockReason).toBe('complete_cheque_fields');
  });
});

describe('family collection collectible allocation', () => {
  it('F. non-collectible installment excluded from smart default', () => {
    expect(isInstallmentCollectibleForAllocation(nonCollectible)).toBe(false);
    const suggested = buildSuggestedFamilyAllocations({
      amount: 500,
      installments,
    });
    expect(suggested['1632']).toBeUndefined();
    expect(suggested['3339']).toBe('500');
  });

  it('G. manual editor receives collectible installments only', () => {
    expect(workflowSource).toContain('installments={collectibleInstallments}');
    expect(manualEditorSource).toContain('selectedChildInstallments.map');
  });

  it('H. stale allocation is removed before persist', () => {
    const sanitized = sanitizeFamilyAllocationInputs({
      values: { 3339: '100', 1632: '50' },
      installments,
    });
    expect(sanitized).toEqual({ 3339: '100' });
    expect(workflowSource).toContain('sanitizeFamilyAllocationInputs');
    expect(parseFamilyAllocationInputs(sanitized)).toEqual([
      { installment_id: 3339, amount: 100 },
    ]);
  });

  it('I. installment_not_collectible triggers one refresh without auto confirm retry', () => {
    expect(workflowSource).toContain("code === 'installment_not_collectible'");
    expect(workflowSource).toContain('pendingCollectibilityRefreshRef');
    expect(workflowSource).toContain('contextState.reload()');
    const handlerMatch = workflowSource.match(
      /function handleInstallmentNotCollectible\([\s\S]*?\n  \}/,
    );
    expect(handlerMatch?.[0] ?? '').not.toContain('handleConfirm');
  });

  it('J. after refresh rebuild excludes invalid installment ids', () => {
    expect(workflowSource).toContain('filterCollectibleFamilyInstallments');
    expect(filterCollectibleFamilyInstallments(installments).map((row) => row.installment_id)).toEqual([
      3339,
    ]);
    expect(readInstallmentNotCollectibleId({ installment_id: 1632 })).toBe(1632);
  });

  it('K. direct confirm flow remains intact', () => {
    expect(workflowSource).toContain('confirmFamilyCollection');
    expect(workflowSource).toContain('FamilyCollectionSmartSummary');
    expect(workflowSource).toContain('FamilyCollectionReviewStep');
    expect(workflowSource).toContain('disabled={confirming || previewing || !confirmState.canConfirm}');
  });
});
