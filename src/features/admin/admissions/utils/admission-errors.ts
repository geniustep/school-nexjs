import type { ApiErrorBody } from '@/types/api';
import {
  resolveKnownApiErrorMessageKey,
  sanitizeUserFacingErrorMessage,
} from '@/lib/utils/user-facing-error';

function errorHttpStatus(error: ApiErrorBody): number | undefined {
  const status = error.details?.status;
  return typeof status === 'number' ? status : undefined;
}

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
  if (code === 'network_error') {
    return t('errors.network');
  }

  const status = errorHttpStatus(error);
  if (status === 502 || status === 503 || status === 504) {
    return t('errors.badGateway');
  }

  const knownKey = resolveKnownApiErrorMessageKey(error.message);
  if (knownKey) {
    const translated = t(knownKey);
    if (translated !== knownKey) return translated;
  }

  if (code === 'validation_error') {
    const fields = error.details?.fields;
    if (fields && typeof fields === 'object') {
      const messages = Object.values(fields as Record<string, string>).filter(Boolean);
      if (messages.length) {
        return messages
          .map((msg) => {
            const mapped = resolveKnownApiErrorMessageKey(msg);
            if (mapped) {
              const translated = t(mapped);
              if (translated !== mapped) return translated;
            }
            return sanitizeUserFacingErrorMessage(msg, t('errors.serverError'));
          })
          .join(' · ');
      }
    }
    return sanitizeUserFacingErrorMessage(error.message, t('errors.serverError'));
  }
  if (error.message) {
    return sanitizeUserFacingErrorMessage(error.message, t('errors.serverError'));
  }
  return t('errors.serverError');
}
