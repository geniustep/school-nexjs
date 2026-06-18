import type { TranslateFn } from '@/features/i18n/locale-context';
import type { ApiErrorBody } from '@/types/api';

export function mapGuardianLinkPartnerError(error: ApiErrorBody, t: TranslateFn): string {
  const code = String(error.code ?? '');
  const message = error.message?.trim() ?? '';

  switch (code) {
    case 'partner_id_required':
      return t('admin.parents.employeeLink.errors.partnerIdRequired');
    case 'partner_not_found':
      return t('admin.parents.employeeLink.errors.partnerNotFound');
    case 'partner_out_of_scope':
      return t('admin.parents.employeeLink.errors.partnerOutOfScope');
    case 'guardian_link_forbidden':
    case 'forbidden':
    case 'permission_denied':
      return t('admin.parents.employeeLink.errors.forbidden');
    case 'user_role_assignment_failed':
      return t('admin.parents.employeeLink.errors.userRoleAssignmentFailed');
    case 'guardian_link_failed':
      return t('admin.parents.employeeLink.errors.linkFailed');
    default: {
      if (message && !message.includes('<') && !message.toLowerCase().includes('traceback')) {
        return message;
      }
      return t('admin.parents.employeeLink.errors.linkFailed');
    }
  }
}
