import type { CoGuardianCandidate } from '@/types/student-co-guardian';

/**
 * Badge i18n keys for a co-guardian candidate.
 *
 * Product rule: sharing a guardian is NOT a confirmed sibling link. The primary
 * badge always reads "same guardian"; the "linked as sibling" badge is added
 * ONLY when the backend confirms it (`is_confirmed_sibling === true`).
 */
export interface CoGuardianCandidateBadges {
  /** Always present — "same guardian". */
  primaryKey: string;
  /** Present only when is_confirmed_sibling === true — "linked as sibling". */
  siblingKey: string | null;
}

export const CO_GUARDIAN_SAME_GUARDIAN_BADGE_KEY =
  'admin.student360.coGuardian.badgeSameGuardian';
export const CO_GUARDIAN_CONFIRMED_SIBLING_BADGE_KEY =
  'admin.student360.coGuardian.badgeConfirmedSibling';

export function resolveCoGuardianCandidateBadges(
  candidate: Pick<CoGuardianCandidate, 'is_confirmed_sibling'>,
): CoGuardianCandidateBadges {
  return {
    primaryKey: CO_GUARDIAN_SAME_GUARDIAN_BADGE_KEY,
    siblingKey: candidate.is_confirmed_sibling
      ? CO_GUARDIAN_CONFIRMED_SIBLING_BADGE_KEY
      : null,
  };
}

/** Whether a candidate may be referred to as a (confirmed) sibling in the UI. */
export function candidateIsConfirmedSibling(
  candidate: Pick<CoGuardianCandidate, 'is_confirmed_sibling'>,
): boolean {
  return candidate.is_confirmed_sibling === true;
}
