import type { TranslateFn } from '@/features/i18n/locale-context';
import type { ApiErrorBody } from '@/types/api';

export function mapParentApiError(error: ApiErrorBody, t: TranslateFn): string {
  const code = String(error.code ?? '');
  const message = error.message?.trim() ?? '';

  if (
    message.includes('student_ids') ||
    message.includes('Direct student_ids') ||
    message.includes('guardian relationship endpoints')
  ) {
    return t('admin.parentProfile.saveRelationshipsManagedSeparately');
  }

  switch (code) {
    case 'validation_error': {
      if (message && !message.includes('<') && !message.toLowerCase().includes('traceback')) {
        if (
          message.includes('student_ids') ||
          message.includes('Direct student_ids') ||
          message.includes('guardian relationship')
        ) {
          return t('admin.parentProfile.saveRelationshipsManagedSeparately');
        }
        return message;
      }
      return t('admin.parentProfile.saveFailed');
    }
    case 'permission_denied':
    case 'forbidden':
      return t('errors.forbidden');
    case 'not_found':
      return t('errors.notFound');
    default: {
      if (message && !message.includes('<') && !message.toLowerCase().includes('traceback')) {
        if (
          message.includes('student_ids') ||
          message.includes('Direct student_ids') ||
          message.includes('guardian relationship')
        ) {
          return t('admin.parentProfile.saveRelationshipsManagedSeparately');
        }
        return message;
      }
      return t('admin.parentProfile.saveFailed');
    }
  }
}
