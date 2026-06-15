export type PasswordStrength = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

export interface AccountPasswordFieldErrors {
  login?: string;
  password?: string;
  confirmPassword?: string;
}

const PASSWORD_CHARS =
  'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*?';

export function generateSecurePassword(length = 14): string {
  const size = Math.max(12, Math.min(length, 24));
  const bytes = new Uint8Array(size);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < size; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < size; i += 1) {
    out += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  }
  return out;
}

export function computePasswordStrength(password: string): PasswordStrength {
  const value = password.trim();
  if (!value) return 'empty';
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (score <= 1) return 'weak';
  if (score === 2) return 'fair';
  if (score === 3) return 'good';
  return 'strong';
}

export function validateAccountPasswordForm(
  input: {
    email: string;
    login: string;
    password: string;
    confirmPassword: string;
  },
  t: (key: string) => string,
): { valid: boolean; errors: AccountPasswordFieldErrors } {
  const errors: AccountPasswordFieldErrors = {};
  const email = input.email.trim();
  const login = input.login.trim();
  const password = input.password;
  const confirmPassword = input.confirmPassword;

  if (!email && !login) {
    errors.login = t('admin.account.errors.loginRequired');
  }
  if (!password) {
    errors.password = t('admin.account.errors.passwordRequired');
  }
  if (!confirmPassword) {
    errors.confirmPassword = t('admin.account.errors.confirmPasswordRequired');
  } else if (password !== confirmPassword) {
    errors.confirmPassword = t('admin.account.errors.passwordMismatch');
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
