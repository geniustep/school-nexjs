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
    ['billing_responsibility_contract_conflict', 'admin.student360.create.billingResponsibility.errors.contractConflict'],
    ['student_billing_confirmation_required', 'admin.student360.create.billingResponsibility.errors.confirmationRequired'],
    ['student_billing_reason_required', 'admin.student360.create.billingResponsibility.errors.reasonRequired'],
    ['billing_responsibility_required', 'admin.student360.financeWorkspace.billingResponsibility.errors.required'],
    ['student_billing_scope_mismatch', 'admin.student360.financeWorkspace.billingResponsibility.errors.scopeMismatch'],
    ['billing_responsibility_unresolved', 'admin.student360.financeWorkspace.billingResponsibility.unresolved.message'],
    ['billing_responsibility_existing_agreement_conflict', 'admin.student360.create.billingResponsibility.errors.existingAgreementConflict'],
    ['invalid_billing_responsibility', 'admin.student360.create.billingResponsibility.errors.invalid'],
    ['invalid_billing_responsibility_mode', 'admin.student360.create.billingResponsibility.errors.invalidMode'],
    ['billing_guardian_required', 'admin.student360.create.billingResponsibility.errors.guardianRequired'],
    ['billing_guardian_ambiguous', 'admin.student360.create.billingResponsibility.errors.billingGuardianSelectionRequired'],
    ['billing_guardian_not_linked', 'admin.student360.create.billingResponsibility.errors.billingGuardianNotLinked'],
    ['billing_guardian_relationship_inactive', 'admin.student360.create.billingResponsibility.errors.billingGuardianRelationshipInactive'],
  ] as const)('maps %s to i18n key', (code, key) => {
    expect(isBillingResponsibilityStableErrorCode(code)).toBe(true);
    expect(resolveBillingResponsibilityErrorMessageKey(code)).toBe(key);
    expect(resolveBillingResponsibilityErrorMessage(code, t)).toBe(`translated:${key}`);
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
      'translated:admin.student360.financeWorkspace.billingResponsibility.unresolved.message',
    );
  });

  it('mapStudentApiError maps billing_responsibility_required to selection field', () => {
    const mapped = mapStudentApiError(
      {
        code: 'billing_responsibility_required',
        message: 'ignored',
      },
      t,
    );
    expect(mapped.fieldErrors?.billingResponsibilitySelection).toBe(mapped.message);
  });

  it('mapStudentApiError maps guardian_identity_candidate_exists to billing step', () => {
    const mapped = mapStudentApiError(
      {
        code: 'guardian_identity_candidate_exists',
        message: 'ignored',
      },
      t,
    );
    expect(mapped.message).toBe(
      'translated:admin.student360.create.billingResponsibility.errors.guardianIdentityCandidateExists',
    );
    expect(mapped.fieldErrors?.guardianRequired).toBe(mapped.message);
  });
});
