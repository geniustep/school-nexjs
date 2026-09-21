import { describe, expect, it, vi } from 'vitest';
import {
  PARENT_ACCOUNT_ACTIVATION_LINK_PATH,
  buildParentActivationLinkPayload,
  canSendParentActivationLink,
  ensureParentActivationAttemptKey,
} from './parent-account-activation-link';

describe('parent account activation link contract', () => {
  it('fails closed unless the backend explicitly allows sending', () => {
    expect(canSendParentActivationLink(undefined)).toBe(false);
    expect(canSendParentActivationLink(null)).toBe(false);
    expect(canSendParentActivationLink({})).toBe(false);
    expect(canSendParentActivationLink({ can_send_activation_link: false })).toBe(false);
    expect(canSendParentActivationLink({ can_send_activation_link: true })).toBe(true);
  });

  it('does not use login or send history as local eligibility', () => {
    expect(
      canSendParentActivationLink({
        can_send_activation_link: true,
        sent_before: true,
        has_logged_in: true,
        blocking_reason: null,
      }),
    ).toBe(true);

    expect(
      canSendParentActivationLink({
        can_send_activation_link: false,
        sent_before: false,
        has_logged_in: false,
        blocking_reason: 'account_blocked',
      }),
    ).toBe(false);
  });

  it('sends only parent_id and a stable idempotency key', () => {
    expect(PARENT_ACCOUNT_ACTIVATION_LINK_PATH).toBe(
      '/admin/integrations/raqeem/messaging/account-activation-link',
    );
    expect(buildParentActivationLinkPayload({ parentId: 42, idempotencyKey: ' retry-1 ' }))
      .toEqual({ parent_id: 42, idempotency_key: 'retry-1' });
  });

  it('keeps the idempotency key stable for a deliberate retry', () => {
    const makeKey = vi.fn(() => 'generated-once');
    const first = ensureParentActivationAttemptKey(null, makeKey);
    expect(ensureParentActivationAttemptKey(first, makeKey)).toBe('generated-once');
    expect(makeKey).toHaveBeenCalledTimes(1);
  });
});
