import type { TranslateFn } from '@/features/i18n/locale-context';
import type { ApiErrorBody } from '@/types/api';
import type { GuardianDuplicateMatch } from '@/types/student-360';

export interface GuardianErrorContext {
  message: string;
  field?: string;
  matches?: GuardianDuplicateMatch[];
}

export function extractGuardianDuplicateMatches(
  details: Record<string, unknown> | undefined,
): GuardianDuplicateMatch[] | undefined {
  if (!details) return undefined;
  const matches = details.matches;
  if (!Array.isArray(matches)) return undefined;
  return matches as GuardianDuplicateMatch[];
}

export function mapGuardianApiError(
  error: ApiErrorBody,
  t: TranslateFn,
): GuardianErrorContext {
  const code = String(error.code ?? '');
  const details = error.details as Record<string, unknown> | undefined;
  const matches = extractGuardianDuplicateMatches(details);

  switch (code) {
    case 'guardian_duplicate':
      return {
        message: t('admin.student360.guardianDuplicate'),
        matches,
      };
    case 'guardian_already_linked':
      return { message: t('admin.student360.guardianAlreadyLinked') };
    case 'primary_guardian_conflict':
      return {
        message: t('admin.student360.primaryGuardianConflict'),
        field: 'is_primary_contact',
      };
    case 'financial_guardian_conflict':
      return {
        message: t('admin.student360.financialGuardianConflict'),
        field: 'is_financial_responsible',
      };
    case 'permission_denied':
    case 'forbidden':
      return { message: t('admin.student360.guardianForbidden') };
    case 'not_found':
      return { message: t('admin.student360.guardianNotFound') };
    case 'validation_error': {
      const msg = error.message?.trim();
      if (msg && !msg.includes('<')) return { message: msg };
      return { message: t('admin.student360.guardianValidation') };
    }
    default: {
      const msg = error.message?.trim();
      if (msg && !msg.includes('<') && !msg.toLowerCase().includes('traceback')) {
        return { message: msg };
      }
      return { message: t('errors.serverError') };
    }
  }
}
