import { describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_ACTIVATION_LINK_MESSAGING_PATH,
  activationLinkBlockers,
  buildAccountActivationLinkPayload,
  ensureAccountActivationAttemptKey,
} from './account-activation-link-messaging';

describe('account activation link messaging contract', () => {
  const readyMember = {
    active: true,
    mobile: '+212600000000',
    phone: null,
    name_ar: 'أحمد',
    name_fr: 'Ahmed',
    account_activation_language: 'ar' as const,
  };

  it('shows no blockers only for a complete recipient and available WhatsApp', () => {
    expect(activationLinkBlockers(readyMember, true)).toEqual([]);
  });

  it('lists every visible prerequisite that blocks the action', () => {
    expect(activationLinkBlockers({ ...readyMember, active: false, mobile: '', name_ar: '', name_fr: '', account_activation_language: null }, false))
      .toEqual(['whatsapp_unavailable', 'staff_inactive', 'phone_missing', 'name_ar_missing', 'name_fr_missing', 'language_missing']);
  });

  it('sends only the trusted staff reference and idempotency key', () => {
    expect(ACCOUNT_ACTIVATION_LINK_MESSAGING_PATH).toBe('/admin/integrations/raqeem/messaging/account-activation-link');
    expect(buildAccountActivationLinkPayload({ staffId: 15, idempotencyKey: ' attempt-1 ' }))
      .toEqual({ staff_id: 15, idempotency_key: 'attempt-1' });
  });

  it('keeps the idempotency key stable for a deliberate retry', () => {
    const makeKey = vi.fn(() => 'generated-once');
    const first = ensureAccountActivationAttemptKey(null, makeKey);
    expect(ensureAccountActivationAttemptKey(first, makeKey)).toBe('generated-once');
    expect(makeKey).toHaveBeenCalledTimes(1);
  });
});
