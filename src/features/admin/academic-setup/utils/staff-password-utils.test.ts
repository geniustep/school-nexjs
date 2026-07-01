import { describe, expect, it } from 'vitest';
import {
  computeStaffPasswordStrength,
  generateStaffPassword,
  meetsStaffPasswordPolicy,
  normalizeStaffPasswordPolicy,
  validateStaffPasswordForm,
} from './staff-password-utils';

const t = (key: string) => key;

describe('staff-password-utils', () => {
  it('normalizes password policy with defaults', () => {
    expect(normalizeStaffPasswordPolicy(undefined)).toEqual({
      min_length: 8,
      requires_letter: true,
      requires_number: true,
    });
  });

  it('validates password and confirmation', () => {
    const policy = normalizeStaffPasswordPolicy(null);
    const ok = validateStaffPasswordForm(
      { password: 'Secret12', confirmPassword: 'Secret12', requirePassword: true },
      policy,
      t,
    );
    expect(ok.valid).toBe(true);

    const mismatch = validateStaffPasswordForm(
      { password: 'Secret12', confirmPassword: 'Other12', requirePassword: true },
      policy,
      t,
    );
    expect(mismatch.valid).toBe(false);
    expect(mismatch.errors.confirmPassword).toBe(
      'admin.academicSetup.staffPassword.errors.confirmPasswordMismatchHint',
    );
  });

  it('generates policy-compliant passwords', () => {
    const policy = normalizeStaffPasswordPolicy(null);
    const generated = generateStaffPassword(policy);
    expect(meetsStaffPasswordPolicy(generated, policy)).toBe(true);
    expect(computeStaffPasswordStrength(generated, policy)).not.toBe('weak');
  });
});
