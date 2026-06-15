import { describe, expect, it } from 'vitest';
import {
  computePasswordStrength,
  generateSecurePassword,
  validateAccountPasswordForm,
} from './account-password-utils';

const t = (key: string) => key;

describe('generateSecurePassword', () => {
  it('generates password with minimum length', () => {
    expect(generateSecurePassword().length).toBeGreaterThanOrEqual(12);
  });
});

describe('computePasswordStrength', () => {
  it('returns empty for blank input', () => {
    expect(computePasswordStrength('')).toBe('empty');
  });

  it('scores longer mixed passwords higher', () => {
    expect(computePasswordStrength('abc')).toBe('weak');
    expect(computePasswordStrength('Abcdefgh1!')).not.toBe('empty');
  });
});

describe('validateAccountPasswordForm', () => {
  it('requires login or email', () => {
    const result = validateAccountPasswordForm(
      { email: '', login: '', password: 'x', confirmPassword: 'x' },
      t,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.login).toBe('admin.account.errors.loginRequired');
  });

  it('requires matching passwords', () => {
    const result = validateAccountPasswordForm(
      { email: 'a@b.c', login: '', password: 'one', confirmPassword: 'two' },
      t,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.confirmPassword).toBe('admin.account.errors.passwordMismatch');
  });

  it('passes valid input', () => {
    expect(
      validateAccountPasswordForm(
        { email: 'a@b.c', login: '', password: 'Secret123!', confirmPassword: 'Secret123!' },
        t,
      ).valid,
    ).toBe(true);
  });
});
