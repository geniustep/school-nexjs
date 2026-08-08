import { describe, expect, it } from 'vitest';
import {
  createRequestGenerationGuard,
  individualDeliverabilityMessageKey,
  isIndividualSubmitAllowed,
  normalizeIndividualCommunicationPreview,
} from './individual-deliverability';
import { communicationErrorMessageKey } from '@/features/channels/utils/communication-errors';

describe('individual deliverability helpers', () => {
  it('normalizes flat individual preview without inventing can_submit', () => {
    const preview = normalizeIndividualCommunicationPreview({
      recipient_type: 'student',
      recipient_count: 1,
      deliverable_user_count: 0,
      can_submit: false,
      account_status: 'no_account',
      blocking_reasons: ['missing_portal_user'],
      exclusion_summary: [{ code: 'missing_portal_user', count: 1 }],
      moderation: { required: false },
    });

    expect(preview).toEqual(
      expect.objectContaining({
        recipient_type: 'student',
        recipient_count: 1,
        deliverable_user_count: 0,
        can_submit: false,
        account_status: 'no_account',
      }),
    );
    expect(isIndividualSubmitAllowed(preview)).toBe(false);
  });

  it('allows submit only when can_submit=true and deliverable_user_count=1', () => {
    expect(
      isIndividualSubmitAllowed({
        can_submit: true,
        deliverable_user_count: 1,
      }),
    ).toBe(true);
    expect(
      isIndividualSubmitAllowed({
        can_submit: true,
        deliverable_user_count: 0,
      }),
    ).toBe(false);
    expect(
      isIndividualSubmitAllowed({
        can_submit: false,
        deliverable_user_count: 1,
      }),
    ).toBe(false);
    expect(isIndividualSubmitAllowed(null)).toBe(false);
  });

  it('maps account_status and exclusion codes to i18n without inventing no_account', () => {
    expect(
      individualDeliverabilityMessageKey({
        can_submit: false,
        deliverable_user_count: 0,
        account_status: 'no_account',
      }),
    ).toBe('communication.general.individualAccountNoAccount');

    expect(
      individualDeliverabilityMessageKey({
        can_submit: false,
        deliverable_user_count: 0,
        account_status: 'inactive',
      }),
    ).toBe('communication.general.individualAccountInactive');

    expect(
      individualDeliverabilityMessageKey({
        can_submit: false,
        deliverable_user_count: 0,
        account_status: 'guardian_inactive',
      }),
    ).toBe('communication.general.individualAccountGuardianInactive');

    expect(
      individualDeliverabilityMessageKey({
        can_submit: false,
        deliverable_user_count: 0,
        exclusion_summary: [{ code: 'missing_portal_user' }],
      }),
    ).toBe('communication.general.individualAccountNoAccount');

    expect(
      individualDeliverabilityMessageKey({
        can_submit: false,
        deliverable_user_count: 0,
      }),
    ).toBe('communication.general.individualDeliverabilityUnavailable');
  });

  it('maps communication_individual_recipient_count_invalid without exposing raw backend text', () => {
    expect(
      communicationErrorMessageKey('communication_individual_recipient_count_invalid'),
    ).toBe('communication.errors.individualRecipientCountInvalid');
    expect(communicationErrorMessageKey('missing_portal_user')).toBe(
      'communication.general.individualAccountNoAccount',
    );
  });

  it('ignores stale preview generations when the recipient changes', () => {
    const guard = createRequestGenerationGuard();
    const first = guard.next();
    const second = guard.next();
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });
});
