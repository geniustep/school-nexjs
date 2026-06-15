import type { TranslateFn } from '@/features/i18n/locale-context';
import type { GuardianSummary, PersonSearchResult } from '@/types/student-360';

export function personHasTeacherRole(
  person: Pick<PersonSearchResult | GuardianSummary, 'existing_roles'>,
): boolean {
  return person.existing_roles?.includes('teacher') ?? false;
}

export function personHasGuardianRole(
  person: Pick<PersonSearchResult | GuardianSummary, 'existing_roles'>,
): boolean {
  return person.existing_roles?.includes('guardian') ?? false;
}

/** Profile line under the person name in search results. */
export function personProfileDescription(
  t: TranslateFn,
  person: Pick<PersonSearchResult | GuardianSummary, 'existing_roles' | 'role_labels'>,
): string {
  if (personHasTeacherRole(person)) {
    return t('admin.student360.personRegisteredAsTeacher');
  }
  if (personHasGuardianRole(person)) {
    return t('admin.student360.personRegisteredAsGuardian');
  }
  const labels = person.role_labels?.filter(Boolean);
  if (labels?.length) return labels.join(' · ');
  return t('admin.student360.personRegisteredInSchool');
}

export function formatRoleLabels(roleLabels: string[] | undefined): string {
  if (!roleLabels?.length) return '';
  return roleLabels.filter(Boolean).join(' · ');
}

export function formatAccountRolesLine(
  t: TranslateFn,
  roleLabels: string[] | undefined,
): string | null {
  const line = formatRoleLabels(roleLabels);
  if (!line) return null;
  return `${t('admin.student360.accountRoles')}: ${line}`;
}

export function normalizeDisplayNameKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function hasDuplicateDisplayNames(results: PersonSearchResult[]): boolean {
  const counts = new Map<string, number>();
  for (const row of results) {
    const key = normalizeDisplayNameKey(row.name);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count > 1);
}

export function shouldShowProfessionalRecordHint(
  person: Pick<PersonSearchResult, 'has_user_account' | 'existing_roles'>,
): boolean {
  return person.has_user_account && personHasTeacherRole(person);
}

export function needsNewAccountFromLink(
  account: { needs_new_account?: boolean } | undefined,
  fallbackHasAccount: boolean,
): boolean {
  if (account && typeof account.needs_new_account === 'boolean') {
    return account.needs_new_account;
  }
  return !fallbackHasAccount;
}

export function personProfileHref(person: Pick<PersonSearchResult, 'guardian_id' | 'teacher_id' | 'id'>): string {
  if (person.guardian_id) return `/admin/parents/${person.guardian_id}`;
  if (person.teacher_id) return `/admin/teachers/${person.teacher_id}`;
  return `/admin/parents/${person.id}`;
}
