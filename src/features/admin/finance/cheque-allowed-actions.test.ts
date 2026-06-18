import { describe, expect, it } from 'vitest';
import { chequeAllowsAction, resolveChequeLifecycleActions } from './cheque-allowed-actions';
import type { FinanceCheque } from '@/types/finance';

const baseCheque: FinanceCheque = {
  id: 1,
  allowed_actions: { view: true, settle: true, reject: true, cancel: false },
};

describe('cheque allowed actions', () => {
  it('reads settle and reject from official allowed_actions map', () => {
    expect(chequeAllowsAction(baseCheque, 'settle')).toBe(true);
    expect(chequeAllowsAction(baseCheque, 'reject')).toBe(true);
    expect(chequeAllowsAction(baseCheque, 'cancel')).toBe(false);
  });

  it('falls back to cancelable states when allowed_actions is absent', () => {
    expect(
      chequeAllowsAction({ state: 'received', allowed_actions: undefined, allowed_action_codes: [] }, 'cancel'),
    ).toBe(true);
    expect(
      chequeAllowsAction({ state: 'cleared', allowed_actions: undefined, allowed_action_codes: [] }, 'cancel'),
    ).toBe(false);
    expect(
      chequeAllowsAction(
        { state: 'received', allowed_actions: { cancel: false }, allowed_action_codes: [] },
        'cancel',
      ),
    ).toBe(false);
  });

  it('maps legacy bounce code to reject only as fallback', () => {
    const cheque: FinanceCheque = {
      id: 2,
      allowed_action_codes: ['deposit', 'bounce', 'cancel'],
    };
    expect(chequeAllowsAction(cheque, 'reject')).toBe(true);
    expect(chequeAllowsAction(cheque, 'settle')).toBe(false);
  });

  it('does not infer settle from settlement_status', () => {
    const cheque: FinanceCheque = {
      id: 3,
      settlement_status: 'pending',
      allowed_actions: { view: true },
    };
    expect(chequeAllowsAction(cheque, 'settle')).toBe(false);
    expect(chequeAllowsAction(cheque, 'reject')).toBe(false);
  });

  it('resolves lifecycle actions in stable order', () => {
    expect(resolveChequeLifecycleActions(baseCheque)).toEqual(['settle', 'reject']);
  });
});
