import { describe, expect, it } from 'vitest';
import {
  buildChequeRegistrationPayload,
  resolveChequeCollectionReference,
  resolveChequeDueDate,
} from '@/features/admin/finance/collection-cheque-payload';
import { formatPaymentJournalLabel, journalsSupportingMethod } from '@/features/admin/finance/format-payment-journal';
import { getCollectionSubmitBlockers } from '@/features/admin/finance/collection-form-validation';
import { normalizeOdooHttpError } from '@/lib/api/parse-odoo-error-response';
import { resolveCollectionErrorMessage } from '@/lib/utils/collection-errors';

const t = (key: string) => key;

describe('collection cheque payload', () => {
  it('maps received_date to collection date automatically', () => {
    const payload = buildChequeRegistrationPayload({
      chequeNumber: '123',
      chequeBank: 'Bank',
      chequeHolder: 'Holder',
      chequeWrittenDate: '2026-06-17',
      chequePostdated: false,
      chequeDueDate: '',
      collectionDate: '2026-06-17',
    });
    expect(payload?.received_date).toBe('2026-06-17');
    expect(payload?.due_date).toBe('2026-06-17');
  });

  it('uses explicit due date for postdated cheques', () => {
    const due = resolveChequeDueDate({
      chequeWrittenDate: '2026-06-17',
      chequePostdated: true,
      chequeDueDate: '2026-07-01',
    });
    expect(due).toBe('2026-07-01');
  });

  it('auto reference mirrors cheque number for backend contract', () => {
    expect(resolveChequeCollectionReference(' QA-99 ')).toBe('QA-99');
  });

  it('rejects postdated due date before written date', () => {
    const payload = buildChequeRegistrationPayload({
      chequeNumber: '123',
      chequeBank: 'Bank',
      chequeHolder: 'Holder',
      chequeWrittenDate: '2026-06-17',
      chequePostdated: true,
      chequeDueDate: '2026-06-01',
      collectionDate: '2026-06-17',
    });
    expect(payload).toBeNull();
  });
});

describe('collection cheque UX helpers', () => {
  it('formats journal label as name — code', () => {
    expect(formatPaymentJournalLabel({ id: 6, name: 'البنك', code: 'BNK1' })).toBe('البنك — BNK1');
  });

  it('filters cheque-capable journals', () => {
    const list = journalsSupportingMethod(
      [
        { id: 6, name: 'Bank', allowed_payment_methods: [{ code: 'cheque' }] },
        { id: 7, name: 'Cash', allowed_payment_methods: [{ code: 'cash' }] },
      ] as never[],
      'cheque',
    );
    expect(list.map((j) => j.id)).toEqual([6]);
  });

  it('does not require separate received date in validation', () => {
    const blockers = getCollectionSubmitBlockers({
      hasStudent: true,
      journalId: '6',
      academicYearId: '1',
      billingPartnerId: '7080',
      resolvedBillingPartnerId: 7080,
      partnersLoading: false,
      partnersLoadFailed: false,
      partnersCount: 1,
      requiresBillingPartnerChoice: false,
      amount: 50,
      paymentMethod: 'cheque',
      allowedMethodCodes: ['cheque'],
      collectionDate: '2026-06-17',
      isCheque: true,
      chequeNumber: 'QA-1',
      chequeBank: 'Bank',
      chequeHolder: 'Holder',
      chequeWrittenDate: '2026-06-17',
      chequePostdated: false,
      chequeDueDate: '',
      reference: '',
      showAllocationStep: true,
      skipAllocation: false,
      allocatedTotal: 50,
      collectionAmount: 50,
      selectedInstallmentCount: 1,
    });
    expect(blockers).not.toContain('completeChequeFields');
  });

  it('surfaces Odoo validation_error message when code has no static key', () => {
    const msg = resolveCollectionErrorMessage(
      'validation_error',
      'المرجع مطلوب لطريقة الدفع المحددة.',
      t,
    );
    expect(msg).toBe('المرجع مطلوب لطريقة الدفع المحددة.');
  });

  it('infers payment_reference_required from Arabic 422 text', () => {
    const body = normalizeOdooHttpError(422, '<p>المرجع مطلوب لطريقة الدفع المحددة.</p>');
    expect(!body.success && body.error?.code).toBe('payment_reference_required');
  });
});
