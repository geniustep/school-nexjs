import type { TranslateFn } from '@/features/i18n/locale-context';
import type { GuardianCandidateWarning, PersonSearchResult } from '@/types/student-360';

export function formatGuardianCandidateWarnings(
  warnings: GuardianCandidateWarning[] | undefined,
): string[] {
  if (!warnings?.length) return [];
  return warnings
    .map((warning) => warning.message?.trim() || '')
    .filter((message) => message.length > 0);
}

export function resolveGuardianLinkBlockerMessage(
  t: TranslateFn,
  person: Pick<PersonSearchResult, 'warnings' | 'can_link_as_guardian'>,
): string {
  const warningMessages = formatGuardianCandidateWarnings(person.warnings);
  if (warningMessages.length > 0) return warningMessages[0]!;
  return t('admin.student360.guardianCandidateCannotLink');
}
