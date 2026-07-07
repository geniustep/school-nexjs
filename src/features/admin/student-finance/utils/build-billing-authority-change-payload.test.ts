import { describe, expect, it } from 'vitest';
import {
  buildBillingAuthorityApplyRequest,
  canSubmitBillingAuthorityApply,
} from './build-billing-authority-change-payload';

describe('student self billing authority apply guards', () => {
  it('requires explicit confirmation before apply request for student target', () => {
    expect(
      canSubmitBillingAuthorityApply({
        previewToken: 'token',
        reason: 'Independent payer',
        selection: { kind: 'student' },
        confirmed: false,
        canApply: true,
      }),
    ).toBe(false);

    expect(
      canSubmitBillingAuthorityApply({
        previewToken: 'token',
        reason: 'Independent payer',
        selection: { kind: 'student' },
        confirmed: true,
        canApply: true,
      }),
    ).toBe(true);
  });

  it('requires non-empty reason before apply request', () => {
    expect(
      canSubmitBillingAuthorityApply({
        previewToken: 'token',
        reason: '   ',
        selection: { kind: 'guardian', guardianId: 9 },
        confirmed: false,
        canApply: true,
      }),
    ).toBe(false);
  });

  it('includes confirmed=true in student apply payload only after confirmation', () => {
    const payload = buildBillingAuthorityApplyRequest({
      previewToken: 'token',
      reason: 'Adult learner',
      selection: { kind: 'student' },
      confirmed: true,
    });
    expect(payload.confirmed).toBe(true);
    expect(payload.reason).toBe('Adult learner');
  });
});
