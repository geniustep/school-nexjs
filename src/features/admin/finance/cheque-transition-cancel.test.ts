import { describe, expect, it } from 'vitest';
import {
  buildChequeTransitionRequestBody,
  canSubmitChequeCancel,
  resolveChequeTransitionErrorMessage,
} from './cheque-transition-cancel';

describe('buildChequeTransitionRequestBody', () => {
  it('blocks cancel submit without reason locally', () => {
    expect(
      buildChequeTransitionRequestBody('cancel', { depositedDate: '2026-06-18', cancelReason: '   ' }),
    ).toEqual({ blocked: 'cancel_reason_required' });
  });

  it('sends only reason for cancel', () => {
    expect(
      buildChequeTransitionRequestBody('cancel', {
        depositedDate: '2026-06-18',
        cancelReason: '  خطأ في التسجيل  ',
      }),
    ).toEqual({ body: { reason: 'خطأ في التسجيل' } });
  });

  it('keeps deposit payload unchanged', () => {
    expect(
      buildChequeTransitionRequestBody('deposit', {
        depositedDate: '2026-06-18',
        cancelReason: '',
      }),
    ).toEqual({ body: { deposited_date: '2026-06-18' } });
  });
});

describe('canSubmitChequeCancel', () => {
  it('requires non-empty reason and not submitting', () => {
    expect(canSubmitChequeCancel('', false)).toBe(false);
    expect(canSubmitChequeCancel('سبب', true)).toBe(false);
    expect(canSubmitChequeCancel('سبب', false)).toBe(true);
  });
});

describe('resolveChequeTransitionErrorMessage', () => {
  const t = (key: string) => `translated:${key}`;

  it('maps cancel_reason_required', () => {
    expect(resolveChequeTransitionErrorMessage('cancel_reason_required', 'x', t)).toBe(
      'translated:admin.finance.cheques.errors.cancelReasonRequired',
    );
  });

  it('maps cheque_cancel_not_allowed', () => {
    expect(resolveChequeTransitionErrorMessage('cheque_cancel_not_allowed', 'x', t)).toBe(
      'translated:admin.finance.cheques.errors.chequeCancelNotAllowed',
    );
  });

  it('maps forbidden for cancel action', () => {
    expect(resolveChequeTransitionErrorMessage('forbidden', 'x', t, 'cancel')).toBe(
      'translated:admin.finance.cheques.errors.chequeCancelForbidden',
    );
  });
});
