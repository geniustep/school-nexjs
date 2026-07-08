import { generateSecurePassword } from '@/lib/account/account-password-utils';
import type { StaffPasswordPolicy } from '@/types/academic-setup';

export type StaffPasswordStrength = 'empty' | 'weak' | 'acceptable' | 'strong';

export interface StaffPasswordFieldErrors {
  password?: string;
  confirmPassword?: string;
}

export const DEFAULT_STAFF_PASSWORD_POLICY: StaffPasswordPolicy = {
  min_length: 8,
  requires_letter: true,
  requires_number: true,
};

export function normalizeStaffPasswordPolicy(
  raw?: StaffPasswordPolicy | null,
): StaffPasswordPolicy {
  if (!raw) return DEFAULT_STAFF_PASSWORD_POLICY;
  return {
    min_length: raw.min_length >= 4 ? raw.min_length : DEFAULT_STAFF_PASSWORD_POLICY.min_length,
    requires_letter: raw.requires_letter ?? DEFAULT_STAFF_PASSWORD_POLICY.requires_letter,
    requires_number: raw.requires_number ?? DEFAULT_STAFF_PASSWORD_POLICY.requires_number,
  };
}

export function generateStaffPassword(policy: StaffPasswordPolicy = DEFAULT_STAFF_PASSWORD_POLICY): string {
  const minLen = Math.max(12, policy.min_length);
  let password = generateSecurePassword(minLen);
  let attempts = 0;
  while (!meetsStaffPasswordPolicy(password, policy) && attempts < 8) {
    password = generateSecurePassword(minLen);
    attempts += 1;
  }
  return password;
}

export function meetsStaffPasswordPolicy(
  password: string,
  policy: StaffPasswordPolicy = DEFAULT_STAFF_PASSWORD_POLICY,
): boolean {
  const value = password.trim();
  if (value.length < policy.min_length) return false;
  if (policy.requires_letter && !/[A-Za-z\u0600-\u06FF]/.test(value)) return false;
  if (policy.requires_number && !/\d/.test(value)) return false;
  return true;
}

export function computeStaffPasswordStrength(
  password: string,
  policy: StaffPasswordPolicy = DEFAULT_STAFF_PASSWORD_POLICY,
): StaffPasswordStrength {
  const value = password.trim();
  if (!value) return 'empty';
  if (!meetsStaffPasswordPolicy(value, policy)) return 'weak';
  if (value.length >= Math.max(policy.min_length + 4, 12) && /[^A-Za-z0-9]/.test(value)) {
    return 'strong';
  }
  return 'acceptable';
}

export function validateStaffPasswordForm(
  input: {
    password: string;
    confirmPassword: string;
    requirePassword: boolean;
  },
  policy: StaffPasswordPolicy,
  t: (key: string, params?: Record<string, string | number>) => string,
): { valid: boolean; errors: StaffPasswordFieldErrors } {
  const errors: StaffPasswordFieldErrors = {};
  const password = input.password;
  const confirmPassword = input.confirmPassword;

  if (input.requirePassword && !password) {
    errors.password = t('admin.academicSetup.staffPassword.errors.passwordRequired');
  } else if (password && !meetsStaffPasswordPolicy(password, policy)) {
    errors.password = t('admin.academicSetup.staffPassword.errors.weakPassword');
  }

  if (input.requirePassword && !confirmPassword) {
    errors.confirmPassword = t('admin.academicSetup.staffPassword.errors.confirmPasswordRequired');
  } else if (password !== confirmPassword) {
    errors.confirmPassword = t('admin.academicSetup.staffPassword.errors.confirmPasswordMismatchHint');
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function resolveStaffAccountLogin(input: {
  email: string;
  login: string;
  useDifferentLogin: boolean;
}): string {
  const email = input.email.trim();
  const login = input.login.trim();
  if (input.useDifferentLogin && login) return login;
  return email || login;
}

export function canCreateStaffAccountWithPassword(options?: {
  account_creation?: { manual_password_supported?: boolean };
  allowed_staff_actions?: { account_create?: boolean };
}): boolean {
  if (options?.allowed_staff_actions?.account_create === false) return false;
  return options?.account_creation?.manual_password_supported !== false;
}

export function canResetStaffAccountPassword(options?: {
  allowed_staff_actions?: { account_reset_password?: boolean };
}): boolean {
  return options?.allowed_staff_actions?.account_reset_password === true;
}

export function clearStaffPasswordState(setters: {
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setShowPassword: (value: boolean) => void;
}): void {
  setters.setPassword('');
  setters.setConfirmPassword('');
  setters.setShowPassword(false);
}

/** Generate a policy-compliant password and apply it to password form state. */
export function applyGeneratedStaffPassword(
  setters: {
    setPassword: (value: string) => void;
    setConfirmPassword: (value: string) => void;
    setShowPassword: (value: boolean) => void;
  },
  policy: StaffPasswordPolicy = DEFAULT_STAFF_PASSWORD_POLICY,
): string {
  const generated = generateStaffPassword(policy);
  setters.setPassword(generated);
  setters.setConfirmPassword(generated);
  setters.setShowPassword(true);
  return generated;
}
