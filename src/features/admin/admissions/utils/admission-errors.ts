import type { ApiErrorBody } from '@/types/api';

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
    return error.message || t('errors.serverError');
  }
  if (error.message && !error.message.includes('<') && !error.message.startsWith('Error:')) {
    return error.message;
  }
  return t('errors.serverError');
}
