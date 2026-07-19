import { describe, expect, it } from 'vitest';
import { communicationErrorMessageKey } from './communication-errors';

describe('communicationErrorMessageKey', () => {
  it('maps stable Backend codes including Odoo 228 aliases', () => {
    expect(communicationErrorMessageKey('communication_message_duplicate')).toBe(
      'communication.errors.duplicate',
    );
    expect(communicationErrorMessageKey('communication_message_audience_changed')).toBe(
      'communication.errors.audienceChanged',
    );
    expect(communicationErrorMessageKey('communication_content_reason_required')).toBe(
      'communication.errors.reasonRequired',
    );
    expect(communicationErrorMessageKey('communication_invalid_transition')).toBe(
      'communication.errors.invalidTransition',
    );
    expect(communicationErrorMessageKey('communication_content_forbidden')).toBe(
      'communication.errors.contentForbidden',
    );
    expect(communicationErrorMessageKey('communication_channel_forbidden')).toBe(
      'communication.errors.channelForbidden',
    );
    expect(communicationErrorMessageKey('communication_cross_school_forbidden')).toBe(
      'communication.errors.crossSchoolForbidden',
    );
    expect(communicationErrorMessageKey('communication_content_cross_school_forbidden')).toBe(
      'communication.errors.crossSchoolForbidden',
    );
    expect(communicationErrorMessageKey('communication_content_not_found')).toBe(
      'communication.errors.contentNotFound',
    );
  });

  it('maps B4 recipient snapshot error codes', () => {
    expect(communicationErrorMessageKey('communication_recipient_resolution_failed')).toBe(
      'communication.errors.recipientResolutionFailed',
    );
    expect(communicationErrorMessageKey('communication_recipient_audience_empty')).toBe(
      'communication.errors.recipientAudienceEmpty',
    );
    expect(communicationErrorMessageKey('communication_recipient_snapshot_required')).toBe(
      'communication.errors.recipientSnapshotRequired',
    );
    expect(communicationErrorMessageKey('communication_recipient_snapshot_mismatch')).toBe(
      'communication.errors.recipientSnapshotMismatch',
    );
    expect(communicationErrorMessageKey('communication_recipient_snapshot_immutable')).toBe(
      'communication.errors.recipientSnapshotImmutable',
    );
    expect(communicationErrorMessageKey('communication_recipient_audience_changed')).toBe(
      'communication.errors.recipientAudienceChanged',
    );
    expect(communicationErrorMessageKey('communication_recipient_expansion_forbidden')).toBe(
      'communication.errors.recipientExpansionForbidden',
    );
  });

  it('returns null for unknown codes', () => {
    expect(communicationErrorMessageKey('totally_unknown')).toBeNull();
  });
});
