import { describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_ACTIVATION_MESSAGING_PATH,
  buildAccountActivationPayload,
  ensureAccountActivationAttemptKey,
  isWhatsAppMessagingEnabled,
} from './account-created-messaging';
import type { CurrentUser } from '@/types/user';

function userWithWhatsApp(enabled: boolean): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: null,
    role: 'admin',
    permissions: [],
    school: null,
    services: { messaging: { whatsapp: { enabled } } },
  };
}

describe('account activation messaging contract', () => {
  it('gates the action on the WhatsApp service capability', () => {
    expect(isWhatsAppMessagingEnabled(userWithWhatsApp(true))).toBe(true);
    expect(isWhatsAppMessagingEnabled(userWithWhatsApp(false))).toBe(false);
    expect(isWhatsAppMessagingEnabled(null)).toBe(false);
  });

  it('sends only the trusted staff reference and idempotency key', () => {
    expect(ACCOUNT_ACTIVATION_MESSAGING_PATH).toBe(
      '/admin/integrations/raqeem/messaging/account-activation',
    );
    const payload = buildAccountActivationPayload({ staffId: 15, idempotencyKey: ' attempt-1 ' });
    expect(payload).toEqual({ staff_id: 15, idempotency_key: 'attempt-1' });
    expect(payload).not.toHaveProperty('recipient');
    expect(payload).not.toHaveProperty('tenant_code');
    expect(payload).not.toHaveProperty('parameters');
    expect(payload).not.toHaveProperty('token');
    expect(payload).not.toHaveProperty('password');
  });

  it('rejects an invalid staff reference', () => {
    expect(() => buildAccountActivationPayload({ staffId: 0, idempotencyKey: 'attempt-1' }))
      .toThrow('staff_id_required');
  });

  it('keeps the same idempotency key for a retry of the same attempt', () => {
    const makeKey = vi.fn(() => 'generated-once');
    const first = ensureAccountActivationAttemptKey(null, makeKey);
    const retry = ensureAccountActivationAttemptKey(first, makeKey);
    expect(first).toBe('generated-once');
    expect(retry).toBe('generated-once');
    expect(makeKey).toHaveBeenCalledTimes(1);
  });
});
