import { describe, expect, it } from 'vitest';
import {
  computePasswordStrength,
  generateSecurePassword,
  validateAccountPasswordForm,
} from './account-password-utils';

const t = (key: string) => key;

describe('generateSecurePassword', () => {
  it('generates passwords that satisfy the backend minimum policy', () => {
    for (let i = 0; i < 20; i += 1) {
      const password = generateSecurePassword();
      expect(password.length).toBeGreaterThanOrEqual(12);
      expect(password).toMatch(/[A-Za-z]/);
      expect(password).toMatch(/\d/);
    }
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

  it('rejects an invalid email on the email field', () => {
    const result = validateAccountPasswordForm(
      { email: 'not-an-email', login: '', password: 'Secret123', confirmPassword: 'Secret123' },
      t,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBe('admin.account.errors.invalidEmail');
  });

  it('rejects weak passwords before any API submit', () => {
    for (const password of ['azerty', 'abcdefgh', '12345678']) {
      const result = validateAccountPasswordForm(
        { email: 'a@b.c', login: '', password, confirmPassword: password },
        t,
      );
      expect(result.valid).toBe(false);
      expect(result.errors.password).toBe('admin.account.errors.passwordTooWeak');
    }
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
