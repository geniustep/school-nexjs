import { describe, expect, it, vi } from 'vitest';
import {
  COLLECTION_DISCARD_DIALOG_TITLE_KEY,
  submitCollectionDiscard,
} from './collection-discard-dialog';
import {
  collectionCanDiscardDraft,
  collectionDiscardErrorMessageKey,
} from './collection-discard';
import { collectionCanReverse } from './collection-reverse';
import { resolveCollectionReviewActions } from './collection-detail-review';
import type { PaymentCollection } from '@/types/finance';

const t = (key: string) => key;

const draftDiscardable = {
  id: 100,
  state: 'draft',
  allowed_actions: {
    confirm: true,
    discard_draft: true,
    cancel: false,
  },
} as PaymentCollection;

const draftNotDiscardable = {
  id: 101,
  state: 'draft',
  allowed_actions: {
    confirm: true,
    discard_draft: false,
  },
} as PaymentCollection;

describe('collection discard draft contract', () => {
  it('shows discard when allowed_actions.discard_draft is true', () => {
    expect(collectionCanDiscardDraft(draftDiscardable)).toBe(true);
    const actions = resolveCollectionReviewActions(draftDiscardable, {
      canCollect: true,
      t,
    });
    expect(actions.canDiscardDraft).toBe(true);
  });

  it('hides discard when allowed_actions.discard_draft is false', () => {
    expect(collectionCanDiscardDraft(draftNotDiscardable)).toBe(false);
    const actions = resolveCollectionReviewActions(draftNotDiscardable, {
      canCollect: true,
      t,
    });
    expect(actions.canDiscardDraft).toBe(false);
  });

  it('does not infer discard from draft state alone', () => {
    const draftOnly = { id: 1, state: 'draft' } as PaymentCollection;
    expect(collectionCanDiscardDraft(draftOnly)).toBe(false);
  });

  it('does not treat discard as reverse substitute', () => {
    const actions = resolveCollectionReviewActions(draftDiscardable, {
      canCollect: true,
      t,
    });
    expect(actions.canDiscardDraft).toBe(true);
    expect(actions.canReverseCollection).toBe(false);
    expect(collectionCanReverse(draftDiscardable)).toBe(false);
  });

  it('hides reverse for draft when cancel is false even if discard is allowed', () => {
    const actions = resolveCollectionReviewActions(draftDiscardable, {
      canCollect: true,
      t,
    });
    expect(actions.canReverseCollection).toBe(false);
  });

  it('uses discard dialog title key for the button label', () => {
    expect(COLLECTION_DISCARD_DIALOG_TITLE_KEY).toBe(
      'admin.finance.collections.detail.discardDraft.title',
    );
  });

  it('maps discard API errors to user-facing keys', () => {
    expect(collectionDiscardErrorMessageKey('forbidden', 403)).toContain('forbidden');
    expect(collectionDiscardErrorMessageKey('not_found', 404)).toContain('notFound');
    expect(collectionDiscardErrorMessageKey('cannot_discard', 422)).toContain('cannotDiscard');
    expect(collectionDiscardErrorMessageKey('server_error', 500)).toContain('generic');
  });
});

describe('collection discard submit flow', () => {
  it('calls discard API and runs success navigation on success', async () => {
    const discardFn = vi.fn().mockResolvedValue({ success: true, data: {} });
    const toastSuccess = vi.fn();
    const toastError = vi.fn();
    const onSuccess = vi.fn();

    const ok = await submitCollectionDiscard({
      collectionId: 100,
      discardFn,
      toastSuccess,
      toastError,
      t,
      onSuccess,
    });

    expect(ok).toBe(true);
    expect(discardFn).toHaveBeenCalledWith(100);
    expect(toastSuccess).toHaveBeenCalledWith(
      'admin.finance.collections.detail.discardDraft.success',
    );
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('surfaces API errors without navigating away', async () => {
    const discardFn = vi.fn().mockResolvedValue({
      success: false,
      error: { code: 'forbidden', message: 'Denied', details: { status: 403 } },
    });
    const onSuccess = vi.fn();

    const ok = await submitCollectionDiscard({
      collectionId: 100,
      discardFn,
      toastSuccess: vi.fn(),
      toastError: vi.fn(),
      t,
      onSuccess,
    });

    expect(ok).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
