import type { ApiErrorBody } from '@/types/api';
import type { AccountWarning } from '@/types/account';

export const ACCOUNT_ERROR_KEYS: Record<string, string> = {
  duplicate_login: 'admin.account.errors.duplicateLogin',
  login_required: 'admin.account.errors.loginRequired',
  email_required_for_invite: 'admin.account.errors.emailRequiredForInvite',
  account_not_available: 'admin.account.errors.accountNotAvailable',
  invalid_email: 'admin.account.errors.invalidEmail',
  invalid_login: 'admin.account.errors.invalidLogin',
  invalid_password: 'admin.account.errors.invalidPassword',
  password_required: 'admin.account.errors.passwordRequired',
  password_too_weak: 'admin.account.errors.passwordTooWeak',
  account_already_exists: 'admin.account.errors.accountAlreadyExists',
  forbidden: 'admin.pageForbidden',
  permission_denied: 'admin.pageForbidden',
  not_found: 'errors.notFound',
  validation_error: 'errors.validationFailed',
};

export const ACCOUNT_WARNING_KEYS: Record<string, string> = {
  custom_login_preserved: 'admin.account.warnings.customLoginPreserved',
  invite_not_sent: 'admin.account.warnings.inviteNotSent',
};

export function mapAccountApiError(
  error: ApiErrorBody,
  t: (key: string) => string,
): string {
  const code = String(error.code ?? '');
  const key = ACCOUNT_ERROR_KEYS[code];
  if (key) {
    const msg = t(key);
    if (msg !== key) return msg;
  }
  if (code === 'unauthenticated') return t('errors.sessionExpired');
  const message = error.message?.trim();
  if (message && !message.includes('<') && !message.toLowerCase().includes('traceback')) {
    return message;
  }
  return t('errors.serverError');
}

export function mapAccountWarning(
  warning: AccountWarning,
  t: (key: string) => string,
): string {
  const key = ACCOUNT_WARNING_KEYS[warning.code];
  if (key) {
    const msg = t(key);
    if (msg !== key) return msg;
  }
  return warning.message?.trim() || warning.code;
}
