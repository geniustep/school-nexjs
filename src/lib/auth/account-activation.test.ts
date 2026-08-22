import { describe, expect, it } from 'vitest';
import { parseActivationPayload } from './account-activation';

describe('account activation payload', () => {
  it('accepts the exact verify contract', () => {
    expect(parseActivationPayload('verify', { phone: ' 0612345678 ', otp: '123456' }))
      .toEqual({ ok: true, body: { phone: '0612345678', otp: '123456' } });
  });

  it('rejects malformed codes and extra fields', () => {
    expect(parseActivationPayload('verify', { phone: '0612345678', otp: '12345' }).ok).toBe(false);
    expect(parseActivationPayload('verify', { phone: '0612345678', otp: '123456', tenant: 'nibras' }).ok).toBe(false);
  });

  it('accepts matching passwords and rejects mismatches', () => {
    expect(parseActivationPayload('set-password', {
      setup_token: 'token', password: 'strong password', password_confirm: 'strong password',
    }).ok).toBe(true);
    expect(parseActivationPayload('set-password', {
      setup_token: 'token', password: 'one', password_confirm: 'two',
    }).ok).toBe(false);
  });
});
