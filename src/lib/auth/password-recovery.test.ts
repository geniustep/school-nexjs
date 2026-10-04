import { describe, expect, it } from 'vitest';
import {
  isPlausibleRecoveryPhone,
  parsePasswordRecoveryPayload,
  parseRetryAfterSeconds,
} from './password-recovery';

describe('password recovery contract helpers', () => {
  it('rejects obviously invalid recovery phone shapes before backend', () => {
    expect(isPlausibleRecoveryPhone('0')).toBe(false);
    expect(isPlausibleRecoveryPhone('12345')).toBe(false);
    expect(isPlausibleRecoveryPhone('abc')).toBe(false);
    expect(isPlausibleRecoveryPhone('0612345678')).toBe(true);
    expect(isPlausibleRecoveryPhone('+212612345678')).toBe(true);
    expect(isPlausibleRecoveryPhone('00212612345678')).toBe(true);
  });

  it('accepts only the request phone field', () => {
    expect(parsePasswordRecoveryPayload('request', { phone: ' 0668707907 ' }))
      .toEqual({ ok: true, body: { phone: '0668707907' } });
    expect(parsePasswordRecoveryPayload('request', {
      phone: '0668707907',
      user_id: 7,
    }).ok).toBe(false);
    expect(parsePasswordRecoveryPayload('request', { phone: '0' }).ok).toBe(false);
  });

  it('accepts exactly six digits for OTP verification', () => {
    expect(parsePasswordRecoveryPayload('verify', {
      phone: '0668707907',
      otp: '123456',
    })).toEqual({
      ok: true,
      body: { phone: '0668707907', otp: '123456' },
    });
    expect(parsePasswordRecoveryPayload('verify', {
      phone: '0668707907',
      otp: '12345',
    }).ok).toBe(false);
  });

  it('accepts the exact recovery completion contract without requiring password equality in BFF', () => {
    expect(parsePasswordRecoveryPayload('complete', {
      recovery_token: 'opaque-token',
      password: 'NewPass34',
      password_confirm: 'NewPass34',
    }).ok).toBe(true);
    expect(parsePasswordRecoveryPayload('complete', {
      recovery_token: 'opaque-token',
      password: 'NewPass34',
      password_confirm: 'NewPass34',
      login: 'secret-login',
    }).ok).toBe(false);
  });

  it('parses Retry-After safely with a 60 second fallback', () => {
    expect(parseRetryAfterSeconds('90')).toBe(90);
    expect(parseRetryAfterSeconds(null)).toBe(60);
    expect(parseRetryAfterSeconds('invalid')).toBe(60);
  });
});
