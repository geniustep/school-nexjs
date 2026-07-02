import { describe, expect, it } from 'vitest';
import {
  collectionCanReverse,
  collectionReceiptState,
  collectionReverseErrorMessageKey,
  validateCollectionReverseReason,
} from './collection-reverse';
import { resolveCollectionReviewActions } from './collection-detail-review';
import type { PaymentCollection } from '@/types/finance';

const t = (key: string) => key;

const confirmedCollection = {
  id: 1482,
  state: 'confirmed',
  allowed_actions: {
    view_receipt: true,
    cancel: true,
  },
} as PaymentCollection;

const cancelledCollection = {
  id: 1483,
  state: 'cancelled',
  allowed_actions: {
    cancel: false,
  },
  receipt: {
    state: 'reversed',
  },
  cancellation_reason: 'تصحيح خطأ',
  cancelled_at: '2026-06-18 10:00:00',
} as PaymentCollection;

describe('collection reverse contract', () => {
  it('hides reverse button when allowed_actions.cancel is false', () => {
    expect(collectionCanReverse(cancelledCollection)).toBe(false);
    const actions = resolveCollectionReviewActions(cancelledCollection, {
      canCollect: true,
      t,
    });
    expect(actions.canReverseCollection).toBe(false);
  });

  it('shows reverse button when allowed_actions.cancel is true', () => {
    expect(collectionCanReverse(confirmedCollection)).toBe(true);
    const actions = resolveCollectionReviewActions(confirmedCollection, {
      canCollect: true,
      t,
    });
    expect(actions.canReverseCollection).toBe(true);
  });

  it('does not show reverse button from state alone without allowed_actions.cancel', () => {
    const draftOnly = {
      id: 1,
      state: 'draft',
    } as PaymentCollection;
    expect(collectionCanReverse(draftOnly)).toBe(false);
  });

  it('does not show reverse button from allowed_actions array', () => {
    const arrayActions = {
      id: 1,
      state: 'confirmed',
      allowed_actions: ['cancel'],
    } as PaymentCollection;
    expect(collectionCanReverse(arrayActions)).toBe(false);
  });

  it('requires a non-empty reason in the modal', () => {
    expect(validateCollectionReverseReason('')).toBe(false);
    expect(validateCollectionReverseReason('   ')).toBe(false);
    expect(validateCollectionReverseReason('سبب صالح')).toBe(true);
  });

  it('maps reverse API errors to user-facing keys', () => {
    expect(collectionReverseErrorMessageKey('forbidden', 403)).toContain('forbidden');
    expect(collectionReverseErrorMessageKey('not_found', 404)).toContain('notFound');
    expect(collectionReverseErrorMessageKey('validation_error', 422)).toContain('cannotReverse');
    expect(collectionReverseErrorMessageKey('server_error', 500)).toContain('generic');
  });

  it('reads reversed receipt state after success payload', () => {
    expect(collectionReceiptState(cancelledCollection)).toBe('reversed');
  });
});
