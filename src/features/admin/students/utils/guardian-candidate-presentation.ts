import type { TranslateFn } from '@/features/i18n/locale-context';
import type { GuardianAllowedActions, GuardianCandidateWarning, PersonSearchResult } from '@/types/student-360';

/** Candidate contract: `can_link_as_guardian=false` always blocks, even if allowed_actions disagrees. */
export function canLinkGuardianCandidate(person: {
  can_link_as_guardian?: boolean;
  allowed_actions?: Pick<GuardianAllowedActions, 'link_as_guardian'> | null;
}): boolean {
  if (person.can_link_as_guardian === false) return false;
  if (person.allowed_actions?.link_as_guardian === false) return false;
  if (person.can_link_as_guardian === true) return true;
  if (person.allowed_actions?.link_as_guardian === true) return true;
  if (
    person.can_link_as_guardian === undefined &&
    person.allowed_actions?.link_as_guardian === undefined
  ) {
    return true;
  }
  return false;
}

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
