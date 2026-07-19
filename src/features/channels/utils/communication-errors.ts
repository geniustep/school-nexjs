/** Map Backend communication error codes to i18n message keys. */

export const COMMUNICATION_ERROR_MESSAGE_KEYS: Record<string, string> = {
  communication_message_pending_review: 'communication.errors.messagePendingReview',
  communication_message_channel_read_only: 'communication.errors.channelReadOnly',
  communication_message_channel_forbidden: 'communication.errors.channelForbidden',
  /** Odoo 228 general channel forbidden (alias-compatible). */
  communication_channel_forbidden: 'communication.errors.channelForbidden',
  communication_message_recipient_not_allowed: 'communication.errors.recipientNotAllowed',
  communication_message_duplicate: 'communication.errors.duplicate',
  communication_message_audience_changed: 'communication.errors.audienceChanged',
  communication_message_not_published: 'communication.errors.notPublished',
  communication_message_direction_unresolved: 'communication.errors.directionUnresolved',
  communication_content_not_found: 'communication.errors.contentNotFound',
  communication_content_forbidden: 'communication.errors.contentForbidden',
  communication_content_invalid_transition: 'communication.errors.invalidTransition',
  communication_invalid_transition: 'communication.errors.invalidTransition',
  communication_content_reason_required: 'communication.errors.reasonRequired',
  communication_content_approved_version_required: 'communication.errors.approvedVersionRequired',
  communication_content_cross_school_forbidden: 'communication.errors.crossSchoolForbidden',
  communication_cross_school_forbidden: 'communication.errors.crossSchoolForbidden',
  /** B4 recipient resolution / snapshot errors */
  communication_recipient_resolution_failed: 'communication.errors.recipientResolutionFailed',
  communication_recipient_audience_empty: 'communication.errors.recipientAudienceEmpty',
  communication_recipient_audience_unresolved: 'communication.errors.recipientAudienceUnresolved',
  communication_recipient_snapshot_required: 'communication.errors.recipientSnapshotRequired',
  communication_recipient_snapshot_mismatch: 'communication.errors.recipientSnapshotMismatch',
  communication_recipient_snapshot_immutable: 'communication.errors.recipientSnapshotImmutable',
  communication_recipient_cross_school_forbidden: 'communication.errors.recipientCrossSchoolForbidden',
  communication_recipient_not_allowed: 'communication.errors.recipientNotAllowedB4',
  communication_recipient_audience_changed: 'communication.errors.recipientAudienceChanged',
  communication_recipient_expansion_forbidden: 'communication.errors.recipientExpansionForbidden',
  permission_denied: 'channels.permissionDenied',
  forbidden: 'channels.permissionDenied',
};

export function communicationErrorMessageKey(code: string | null | undefined): string | null {
  if (!code) return null;
  return COMMUNICATION_ERROR_MESSAGE_KEYS[code] ?? null;
}
