import { describe, expect, it } from 'vitest';
import {
  isBillingResponsibilityStableErrorCode,
  resolveBillingResponsibilityErrorMessage,
  resolveBillingResponsibilityErrorMessageKey,
} from './billing-responsibility-errors';
import { mapStudentApiError } from './student-api-errors';

const t = (key: string) => `translated:${key}`;

describe('billing responsibility error mapping', () => {
  it.each([
    ['billing_responsibility_contract_conflict', 'contractConflict'],
    ['student_billing_confirmation_required', 'confirmationRequired'],
    ['student_billing_reason_required', 'reasonRequired'],
    ['billing_responsibility_unresolved', 'unresolved'],
    ['billing_responsibility_existing_agreement_conflict', 'existingAgreementConflict'],
    ['invalid_billing_responsibility', 'invalid'],
    ['invalid_billing_responsibility_mode', 'invalidMode'],
  ] as const)('maps %s to i18n key', (code, suffix) => {
    expect(isBillingResponsibilityStableErrorCode(code)).toBe(true);
    expect(resolveBillingResponsibilityErrorMessageKey(code)).toBe(
      `admin.student360.create.billingResponsibility.errors.${suffix}`,
    );
    expect(resolveBillingResponsibilityErrorMessage(code, t)).toBe(
      `translated:admin.student360.create.billingResponsibility.errors.${suffix}`,
    );
  });

  it('mapStudentApiError uses error.code without parsing message text', () => {
    const mapped = mapStudentApiError(
      {
        code: 'student_billing_reason_required',
        message: 'Some unrelated English backend text',
      },
      t,
    );
    expect(mapped.message).toBe(
      'translated:admin.student360.create.billingResponsibility.errors.reasonRequired',
    );
    expect(mapped.fieldErrors?.billingStudentReason).toBe(mapped.message);
  });

  it('mapStudentApiError maps unresolved code', () => {
    const mapped = mapStudentApiError(
      {
        code: 'billing_responsibility_unresolved',
        message: 'ignored message body',
      },
      t,
    );
    expect(mapped.message).toBe(
      'translated:admin.student360.create.billingResponsibility.errors.unresolved',
    );
  });
});
