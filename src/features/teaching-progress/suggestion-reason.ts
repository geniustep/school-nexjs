/**
 * Central mapping for Backend suggestion_reason enums.
 * Never expose the raw enum to end users.
 */

import type { TeachingSuggestionReason } from '@/types/teaching-delivery';

export const KNOWN_SUGGESTION_REASONS = [
  'resume_partial_line',
  'postponed_due',
  'first_remaining_by_sequence',
  'plan_completed',
] as const;

export type KnownSuggestionReason = (typeof KNOWN_SUGGESTION_REASONS)[number];

/** i18n key under teacher.teachingProgress.suggestionReasons.* / admin… */
export function suggestionReasonMessageKey(
  reason: TeachingSuggestionReason | null | undefined,
): string {
  if (reason && (KNOWN_SUGGESTION_REASONS as readonly string[]).includes(reason)) {
    return `teacher.teachingProgress.suggestionReasons.${reason}`;
  }
  return 'teacher.teachingProgress.suggestionReasons.fallback';
}

export function isKnownSuggestionReason(
  reason: string | null | undefined,
): reason is KnownSuggestionReason {
  return Boolean(reason && (KNOWN_SUGGESTION_REASONS as readonly string[]).includes(reason));
}
