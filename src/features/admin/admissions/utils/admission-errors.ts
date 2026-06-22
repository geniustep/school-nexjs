import type { ApiErrorBody } from '@/types/api';
import { sanitizeUserFacingErrorMessage } from '@/lib/utils/user-facing-error';

export function admissionApiErrorMessage(
  error: ApiErrorBody,
  t: (key: string) => string,
): string {
  const code = error.code;
  if (code === 'unauthenticated' || code === 'invalid_credentials') {
    return t('errors.sessionExpired');
  }
  if (code === 'forbidden' || code === 'permission_denied') {
    return t('errors.forbidden');
  }
  if (code === 'not_found') {
    return t('admin.admissions.errors.notFound');
  }
  if (code === 'validation_error') {
    const fields = error.details?.fields;
    if (fields && typeof fields === 'object') {
      const messages = Object.values(fields as Record<string, string>).filter(Boolean);
      if (messages.length) return messages.join(' · ');
    }
    return sanitizeUserFacingErrorMessage(error.message, t('errors.serverError'));
  }
  if (error.message) {
    return sanitizeUserFacingErrorMessage(error.message, t('errors.serverError'));
  }
  return t('errors.serverError');
}
