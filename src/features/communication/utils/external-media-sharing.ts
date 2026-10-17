import type { RecipientScope } from '@/types/recipient-scope';

/**
 * Only new school-wide announcements are eligible for opt-in external media sharing.
 * Odoo remains the final authority, including the approved version snapshot.
 */
export function eligibleForExternalMediaShare(
  contentType: string,
  scope: RecipientScope | null,
): boolean {
  return contentType === 'announcement' && scope?.scope_type === 'school';
}

/** Fail closed when the UI flag or required scope is absent. */
export function effectiveExternalMediaShare(
  contentType: string,
  scope: RecipientScope | null,
  selected: boolean | undefined,
): boolean {
  return eligibleForExternalMediaShare(contentType, scope) && selected === true;
}
