import { describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_CREATED_MESSAGING_PATH,
  buildAccountCreatedPayload,
  ensureAccountCreatedAttemptKey,
  isWhatsAppMessagingEnabled,
  resolveAccountCreatedTemplateMetadata,
  resolveTenantCodeForAccountCreated,
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

describe('account-created messaging contract', () => {
  it('gates the action on the WhatsApp service capability', () => {
    expect(isWhatsAppMessagingEnabled(userWithWhatsApp(true))).toBe(true);
    expect(isWhatsAppMessagingEnabled(userWithWhatsApp(false))).toBe(false);
    expect(isWhatsAppMessagingEnabled(null)).toBe(false);
  });

  it('uses only the exact Odoo endpoint and safe payload keys', () => {
    expect(ACCOUNT_CREATED_MESSAGING_PATH).toBe(
      '/admin/integrations/raqeem/messaging/account-created',
    );

    const payload = buildAccountCreatedPayload({
      recipient: ' +212600000000 ',
      metadata: {
        tenantCode: 'school',
        schoolNameFr: 'École Test',
        schoolNameAr: 'مدرسة الاختبار',
      },
      idempotencyKey: 'attempt-1',
    });

    expect(Object.keys(payload)).toEqual(['recipient', 'parameters', 'idempotency_key']);
    expect(Object.keys(payload.parameters)).toEqual([
      'tenant_code',
      'school_name_fr',
      'school_name_ar',
    ]);
    expect(payload).toEqual({
      recipient: '+212600000000',
      parameters: {
        tenant_code: 'school',
        school_name_fr: 'École Test',
        school_name_ar: 'مدرسة الاختبار',
      },
      idempotency_key: 'attempt-1',
    });
    expect(payload).not.toHaveProperty('provider');
    expect(payload).not.toHaveProperty('template');
    expect(payload).not.toHaveProperty('tenant_code');
    expect(payload).not.toHaveProperty('token');
    expect(payload).not.toHaveProperty('password');
  });

  it('keeps the same idempotency key for a retry of the same attempt', () => {
    const makeKey = vi.fn(() => 'generated-once');
    const first = ensureAccountCreatedAttemptKey(null, makeKey);
    const retry = ensureAccountCreatedAttemptKey(first, makeKey);

    expect(first).toBe('generated-once');
    expect(retry).toBe('generated-once');
    expect(makeKey).toHaveBeenCalledTimes(1);
  });

  it('resolves tenant from the Raqeem host and falls back only to a valid school slug', () => {
    expect(resolveTenantCodeForAccountCreated('school.raqeem.ma', 'ignored')).toBe('school');
    expect(resolveTenantCodeForAccountCreated('nibras.raqeem.ma', 'ignored')).toBe('nibras');
    expect(resolveTenantCodeForAccountCreated('preview.vercel.app', 'school')).toBe('school');
    expect(resolveTenantCodeForAccountCreated('preview.vercel.app', 'École Test')).toBeNull();
  });

  it('never synthesizes translations when localized school names are absent', () => {
    expect(
      resolveAccountCreatedTemplateMetadata({
        tenantCode: 'school',
        schoolName: 'Groupe Scolaire Test',
      }),
    ).toEqual({
      tenantCode: 'school',
      schoolNameFr: 'Groupe Scolaire Test',
      schoolNameAr: 'Groupe Scolaire Test',
    });
  });
});
