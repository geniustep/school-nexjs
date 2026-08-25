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

  it('sends student mode without a guardian confirmation or reason', () => {
    const request = buildBillingResponsibilityRequest({
      ...defaultStudentCreateBillingFormState(),
      responsibilitySelection: 'student',
    });
    expect(request).toEqual({
      mode: 'student',
      confirmed: true,
      reason: 'student_selected_without_guardian',
    });
  });

  it('returns null for student with an optional guardian when confirmation is missing', () => {
    const request = buildBillingResponsibilityRequest({
      ...defaultStudentCreateBillingFormState(),
      responsibilitySelection: 'student',
      addGuardianForStudent: true,
      studentBillingConfirmed: false,
      studentBillingReason: 'valid reason',
    });
    expect(request).toBeNull();
  });

  it('returns null for student with an optional guardian and whitespace-only reason', () => {
    expect(isStudentBillingReasonValid('   ')).toBe(false);
    const request = buildBillingResponsibilityRequest({
      ...defaultStudentCreateBillingFormState(),
      responsibilitySelection: 'student',
      addGuardianForStudent: true,
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
  it('blocks submit when the optional guardian flow lacks student confirmation', () => {
    const result = validateBillingResponsibilityForm(
      {
        ...defaultStudentCreateBillingFormState(),
        responsibilitySelection: 'student',
        addGuardianForStudent: true,
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

  it('blocks submit when the optional guardian flow lacks a reason', () => {
    const result = validateBillingResponsibilityForm(
      {
        ...defaultStudentCreateBillingFormState(),
        responsibilitySelection: 'student',
        addGuardianForStudent: true,
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

  it('defaults responsibility to guardian', () => {
    const state = defaultStudentCreateBillingFormState();
    expect(state.responsibilitySelection).toBe('guardian');
    expect(buildBillingResponsibilityRequest(state)).toEqual({ mode: 'guardian' });
  });

  it('accepts a student responsibility selection without a guardian', () => {
    const result = validateBillingResponsibilityForm(
      {
        ...defaultStudentCreateBillingFormState(),
        responsibilitySelection: 'student',
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

  it('blocks post-create finance redirect for needs_selection', () => {
    const outcome = parseBillingResponsibilityOutcome({
      id: 15,
      billing_responsibility: {
        status: 'needs_selection',
        requires_selection: true,
      },
      collection_gate: { collect_allowed: true },
    });
    expect(outcome.metadata?.status).toBe('needs_selection');
    expect(shouldBlockPostCreateCollectionRedirect(outcome)).toBe(true);
  });

  it('parses extended billing responsibility metadata fields', () => {
    const outcome = parseBillingResponsibilityOutcome({
      billing_responsibility: {
        status: 'legacy_unknown',
        billing_partner_id: 42,
        requires_selection: false,
        requires_student_confirmation: true,
        review_required: true,
        warning_codes: ['legacy_import'],
        data_quality_flags: ['missing_guardian_link'],
      },
    });
    expect(outcome.metadata).toMatchObject({
      status: 'legacy_unknown',
      billing_partner_id: 42,
      requires_student_confirmation: true,
      review_required: true,
      warning_codes: ['legacy_import'],
      data_quality_flags: ['missing_guardian_link'],
    });
  });
});

describe('admission prefill regression', () => {
  it('default billing form state uses guardian rather than student mode', () => {
    const state = defaultStudentCreateBillingFormState();
    expect(state.responsibilitySelection).not.toBe('student');
    expect(state.responsibilitySelection).toBe('guardian');
    expect(buildBillingResponsibilityRequest(state)).toEqual({ mode: 'guardian' });
  });
});
