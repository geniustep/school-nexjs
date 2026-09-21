import { describe, expect, it, vi } from 'vitest';
import {
  PARENT_ACCOUNT_ACTIVATION_LINK_PATH,
  buildParentActivationLinkPayload,
  canSendParentActivationLink,
  ensureParentActivationAttemptKey,
  formatParentActivationDateTime,
  parentActivationLinkBlockingCopyKey,
  parentActivationLinkErrorKind,
  parentActivationLinkIsResend,
  parentActivationLinkRequiresConfirmation,
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

  it('requires confirmation for an eligible account that has already been used', () => {
    expect(
      parentActivationLinkRequiresConfirmation({
        can_send_activation_link: true,
        has_logged_in: true,
      }),
    ).toBe(true);
    expect(
      parentActivationLinkRequiresConfirmation({
        can_send_activation_link: false,
        has_logged_in: true,
      }),
    ).toBe(false);
    expect(
      parentActivationLinkRequiresConfirmation({
        can_send_activation_link: true,
        has_logged_in: false,
      }),
    ).toBe(false);
  });

  it('treats prior send or prior login as resend UX without changing eligibility', () => {
    expect(parentActivationLinkIsResend({ sent_before: true, has_logged_in: false })).toBe(true);
    expect(parentActivationLinkIsResend({ sent_before: false, has_logged_in: true })).toBe(true);
    expect(parentActivationLinkIsResend({ sent_before: false, has_logged_in: false })).toBe(false);
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

  it('maps backend blockers to safe user-facing copy buckets', () => {
    expect(parentActivationLinkBlockingCopyKey('no_active_relationship'))
      .toBe('blockedNoActiveRelationship');
    expect(parentActivationLinkBlockingCopyKey('account_blocked'))
      .toBe('blockedNotEligible');
    expect(parentActivationLinkBlockingCopyKey('not_legal_guardian'))
      .toBe('blockedNotEligible');
    expect(parentActivationLinkBlockingCopyKey('communication_not_allowed'))
      .toBe('blockedCommunicationNotAllowed');
    expect(parentActivationLinkBlockingCopyKey('no_user_account'))
      .toBe('blockedNoUserAccount');
    expect(parentActivationLinkBlockingCopyKey('inactive_user_account'))
      .toBe('blockedInactiveUserAccount');
    expect(parentActivationLinkBlockingCopyKey('identity_unavailable'))
      .toBe('blockedIdentityUnavailable');
    expect(parentActivationLinkBlockingCopyKey('entitlement_disabled'))
      .toBe('blockedWhatsAppUnavailable');
    expect(parentActivationLinkBlockingCopyKey('unknown_future_code'))
      .toBe('blockedGeneric');
  });

  it('maps transport errors without exposing raw backend messages', () => {
    expect(parentActivationLinkErrorKind({ code: 'forbidden', details: { status: 403 } }))
      .toBe('forbidden');
    expect(parentActivationLinkErrorKind({ code: 'activation_failed', details: { status: 422 } }))
      .toBe('blocked');
    expect(parentActivationLinkErrorKind({ code: 'idempotency_conflict', details: { status: 409 } }))
      .toBe('conflict');
    expect(parentActivationLinkErrorKind({ code: 'messaging_rejected', details: { status: 503 } }))
      .toBe('unavailable');
    expect(parentActivationLinkErrorKind({ code: 'network_error', details: {} }))
      .toBe('network');
  });

  it('formats Odoo datetime values for the current locale and safely falls back', () => {
    expect(formatParentActivationDateTime(null, 'en')).toBeNull();
    expect(formatParentActivationDateTime('not-a-date', 'en')).toBe('not-a-date');

    const formatted = formatParentActivationDateTime('2026-09-21 12:00:00', 'en');
    expect(typeof formatted).toBe('string');
    expect(formatted).not.toBe('2026-09-21 12:00:00');
  });
});
