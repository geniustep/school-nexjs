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

const GUARDIAN_CANDIDATE_WARNING_KEYS: Record<string, string> = {
  guardian_of_other_students: 'admin.student360.guardianCandidateWarnings.guardianOfOtherStudents',
  already_linked_to_student: 'admin.student360.guardianCandidateWarnings.alreadyLinkedToStudent',
  existing_teacher_role: 'admin.student360.guardianCandidateWarnings.existingTeacherRole',
  existing_staff_role: 'admin.student360.guardianCandidateWarnings.existingStaffRole',
  has_user_account: 'admin.student360.guardianCandidateWarnings.hasUserAccount',
};

function readWarningCount(warning: GuardianCandidateWarning): number | undefined {
  if (typeof warning.count === 'number' && Number.isFinite(warning.count)) {
    return warning.count;
  }
  const message = warning.message ?? '';
  const match = message.match(/%\(\s*count\s*\)\s*s/) ?? message.match(/\{count\}/);
  if (!match) return undefined;
  const fromParams = warning.params?.count;
  if (typeof fromParams === 'number' && Number.isFinite(fromParams)) return fromParams;
  if (typeof fromParams === 'string' && fromParams.trim()) {
    const parsed = Number(fromParams);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function translateGuardianCandidateWarning(
  t: TranslateFn,
  warning: GuardianCandidateWarning,
): string | null {
  const key = GUARDIAN_CANDIDATE_WARNING_KEYS[warning.code];
  if (key) {
    const count = readWarningCount(warning);
    if (warning.code === 'guardian_of_other_students') {
      return t(key, { count: count ?? 0 });
    }
    return t(key);
  }

  const message = warning.message?.trim();
  if (!message || message.includes('%(') || message.includes('%(count)s')) {
    return null;
  }
  return null;
}

export function formatGuardianCandidateWarnings(
  t: TranslateFn,
  warnings: GuardianCandidateWarning[] | undefined,
  options?: { skipCodes?: string[] },
): string[] {
  if (!warnings?.length) return [];
  const skip = new Set(options?.skipCodes ?? []);
  const seen = new Set<string>();
  const messages: string[] = [];

  for (const warning of warnings) {
    if (skip.has(warning.code)) continue;
    const message = translateGuardianCandidateWarning(t, warning);
    if (!message || seen.has(message)) continue;
    seen.add(message);
    messages.push(message);
  }

  return messages;
}

export function resolveGuardianLinkBlockerMessage(
  t: TranslateFn,
  person: Pick<PersonSearchResult, 'warnings' | 'can_link_as_guardian'>,
): string {
  const warningMessages = formatGuardianCandidateWarnings(t, person.warnings);
  if (warningMessages.length > 0) return warningMessages[0]!;
  return t('admin.student360.guardianCandidateCannotLink');
}
