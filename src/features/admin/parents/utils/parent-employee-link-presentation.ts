import type { TranslateFn } from '@/features/i18n/locale-context';
import type { ExistingPersonRole } from '@/types/guardian-link';

const ROLE_TRANSLATION_KEYS: Record<ExistingPersonRole, string> = {
  guardian: 'admin.parents.employeeLink.roles.guardian',
  teacher: 'admin.parents.employeeLink.roles.teacher',
  admin: 'admin.parents.employeeLink.roles.admin',
  employee: 'admin.parents.employeeLink.roles.employee',
  student: 'admin.parents.employeeLink.roles.student',
  user: 'admin.parents.employeeLink.roles.user',
};

export function formatExistingPersonRoles(
  t: TranslateFn,
  roles: ExistingPersonRole[] | string[] | undefined,
): string {
  if (!roles?.length) return '';
  return roles
    .map((role) => {
      const key = ROLE_TRANSLATION_KEYS[role as ExistingPersonRole];
      return key ? t(key) : role;
    })
    .filter(Boolean)
    .join(' · ');
}

export function parentEmployeeLinkSearchLabels(t: TranslateFn) {
  return {
    description: t('admin.parents.employeeLink.searchLabel'),
    placeholder: t('admin.parents.employeeLink.searchPlaceholder'),
    emptyMessage: t('admin.parents.employeeLink.noResults'),
    emptyHint: undefined,
    searchError: t('admin.parents.employeeLink.errors.searchFailed'),
    duplicateWarning: t('admin.parents.employeeLink.duplicateHint'),
    linkButton: t('admin.parents.employeeLink.linkButton'),
  };
}
