import { describe, expect, it } from 'vitest';
import { buildStudentCreatePayload, defaultStudentProfileFormState } from './student-profile';
import {
  applyBillingResponsibilityToPayload,
  buildBillingResponsibilityRequest,
  defaultStudentCreateBillingFormState,
  isStudentBillingReasonValid,
  parseBillingResponsibilityOutcome,
  shouldBlockPostCreateCollectionRedirect,
  validateBillingResponsibilityForm,
} from './student-create-billing-responsibility';

const t = (key: string) => key;

describe('buildBillingResponsibilityRequest', () => {
  it('sends guardian mode without student confirmation or reason', () => {
    const request = buildBillingResponsibilityRequest({
      ...defaultStudentCreateBillingFormState(),
      responsibilitySelection: 'guardian',
    });
    expect(request).toEqual({ mode: 'guardian' });
  });

  it('sends student mode with confirmed=true and trimmed reason', () => {
    const request = buildBillingResponsibilityRequest({
      ...defaultStudentCreateBillingFormState(),
      responsibilitySelection: 'student',
      studentBillingConfirmed: true,
      studentBillingReason: '  adult learner  ',
    });
    expect(request).toEqual({
      mode: 'student',
      confirmed: true,
      reason: 'adult learner',
    });
  });

  it('returns null for student without confirmation', () => {
    const request = buildBillingResponsibilityRequest({
      ...defaultStudentCreateBillingFormState(),
      responsibilitySelection: 'student',
      studentBillingConfirmed: false,
      studentBillingReason: 'valid reason',
    });
    expect(request).toBeNull();
  });

  it('returns null for student with whitespace-only reason', () => {
    expect(isStudentBillingReasonValid('   ')).toBe(false);
    const request = buildBillingResponsibilityRequest({
      ...defaultStudentCreateBillingFormState(),
      responsibilitySelection: 'student',
      studentBillingConfirmed: true,
      studentBillingReason: '   ',
    });
    expect(request).toBeNull();
  });

  it('returns null when no selection was made', () => {
    const request = buildBillingResponsibilityRequest({
      ...defaultStudentCreateBillingFormState(),
      responsibilitySelection: 'needs_selection',
    });
    expect(request).toBeNull();
  });
});

describe('applyBillingResponsibilityToPayload', () => {
  it('attaches a single canonical billing_responsibility object', () => {
    const base = buildStudentCreatePayload(defaultStudentProfileFormState(null));
    const payload = applyBillingResponsibilityToPayload(base, {
      ...defaultStudentCreateBillingFormState(),
      responsibilitySelection: 'guardian',
    });
    expect(payload.billing_responsibility).toEqual({ mode: 'guardian' });
    expect(payload).not.toHaveProperty('billing_partner_type');
    expect(Object.keys(payload).filter((key) => key.includes('billing'))).toEqual([
      'billing_responsibility',
    ]);
  });

  it('does not attach billing_responsibility when selection is invalid', () => {
    const base = buildStudentCreatePayload(defaultStudentProfileFormState(null));
    const payload = applyBillingResponsibilityToPayload(base, {
      ...defaultStudentCreateBillingFormState(),
      responsibilitySelection: 'needs_selection',
    });
    expect(payload.billing_responsibility).toBeUndefined();
  });
});

describe('validateBillingResponsibilityForm', () => {
  it('blocks submit when student confirmation is missing', () => {
    const result = validateBillingResponsibilityForm(
      {
        ...defaultStudentCreateBillingFormState(),
        responsibilitySelection: 'student',
        studentBillingConfirmed: false,
        studentBillingReason: 'reason',
      },
      t,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.billingStudentConfirmed).toBe(
      'admin.student360.create.billingResponsibility.errors.confirmationRequired',
    );
  });

  it('blocks submit when student reason is missing', () => {
    const result = validateBillingResponsibilityForm(
      {
        ...defaultStudentCreateBillingFormState(),
        responsibilitySelection: 'student',
        studentBillingConfirmed: true,
        studentBillingReason: '  ',
      },
      t,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.billingStudentReason).toBe(
      'admin.student360.create.billingResponsibility.errors.reasonRequired',
    );
  });

  it('blocks submit when no responsibility was selected', () => {
    const result = validateBillingResponsibilityForm(
      {
        ...defaultStudentCreateBillingFormState(),
        responsibilitySelection: 'needs_selection',
      },
      t,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.billingResponsibilitySelection).toBeTruthy();
  });

  it('does not silently fallback to student when guardian is default', () => {
    const state = defaultStudentCreateBillingFormState();
    expect(state.responsibilitySelection).toBe('guardian');
    expect(buildBillingResponsibilityRequest(state)?.mode).toBe('guardian');
  });

  it('accepts valid explicit student selection', () => {
    const result = validateBillingResponsibilityForm(
      {
        ...defaultStudentCreateBillingFormState(),
        responsibilitySelection: 'student',
        studentBillingConfirmed: true,
        studentBillingReason: 'Independent payer',
      },
      t,
    );
    expect(result.valid).toBe(true);
  });
});

describe('parseBillingResponsibilityOutcome', () => {
  it('reads unresolved metadata and collection gate', () => {
    const outcome = parseBillingResponsibilityOutcome({
      id: 12,
      billing_responsibility: {
        mode: 'guardian',
        status: 'unresolved',
        source: 'guardian_unresolved',
      },
      collection_gate: { collect_allowed: false },
      allowed_actions: { collect_payment: false },
    });
    expect(outcome.metadata?.status).toBe('unresolved');
    expect(outcome.collectionAllowed).toBe(false);
    expect(shouldBlockPostCreateCollectionRedirect(outcome)).toBe(true);
  });

  it('allows normal path for resolved guardian', () => {
    const outcome = parseBillingResponsibilityOutcome({
      id: 13,
      billing_responsibility: {
        mode: 'guardian',
        status: 'resolved',
        source: 'guardian_explicit',
      },
      collection_gate: { collect_allowed: true },
    });
    expect(outcome.metadata?.status).toBe('resolved');
    expect(shouldBlockPostCreateCollectionRedirect(outcome)).toBe(false);
  });

  it('allows normal path for valid explicit student', () => {
    const outcome = parseBillingResponsibilityOutcome({
      id: 14,
      billing_responsibility: {
        mode: 'student',
        status: 'resolved',
        source: 'student_explicit',
      },
    });
    expect(outcome.metadata?.status).toBe('resolved');
    expect(shouldBlockPostCreateCollectionRedirect(outcome)).toBe(false);
  });
});

describe('admission prefill regression', () => {
  it('default billing form state does not force student mode without guardian', () => {
    const state = defaultStudentCreateBillingFormState();
    expect(state.responsibilitySelection).not.toBe('student');
    expect(buildBillingResponsibilityRequest(state)).toEqual({ mode: 'guardian' });
  });
});
