import { describe, expect, it } from 'vitest';
import {
  buildAdmissionRegistrationContext,
  extractAdmissionGuardianPrefillText,
  mapAdmissionPrefillToStudentProfile,
  resolveAdmissionGuardianSelection,
  shouldApplyGuardianPrefillToProfile,
} from './admission-prefill-mapper';
import {
  isAdmissionConverted,
  parseAdmissionConversionFromCreateResponse,
} from './admission-atomic-conversion';
import {
  applyStudentCreateGuardianAtomicContractToPayload,
  validateStudentCreateGuardianContract,
} from '@/features/admin/students/utils/student-create-guardian-payload';
import {
  buildStudentCreatePayload,
  defaultStudentProfileFormState,
} from '@/features/admin/students/utils/student-profile';
import { defaultStudentCreateBillingFormState } from '@/features/admin/students/utils/student-create-billing-responsibility';
import { mapStudentApiError } from '@/features/admin/students/utils/student-api-errors';
import type { AdmissionPrefill } from '@/types/admission';

const t = (key: string) => key;

const textPrefillRuntimeSample: AdmissionPrefill = {
  student: { first_name: 'QA', last_name: 'Child' },
  guardian: {
    name: 'ولي نصي',
    phone: '0611111111',
    relationship: 'father',
  },
  academic: {},
  admission: {},
  has_guardian_id: false,
  selection_required: true,
  is_existing_guardian_selected: false,
  guardian_selection: {
    selection_required: true,
    has_bound_guardian: false,
  },
  warning_codes: ['guardian_selection_required'],
};

describe('admission guardian selection contract', () => {
  it('treats text prefill without guardian_id as selection required, not selected', () => {
    const selection = resolveAdmissionGuardianSelection(textPrefillRuntimeSample);
    expect(selection.selectionRequired).toBe(true);
    expect(selection.isExistingGuardianSelected).toBe(false);
    expect(selection.hasBoundGuardian).toBe(false);
    expect(selection.guardianId).toBeNull();
    expect(shouldApplyGuardianPrefillToProfile(selection)).toBe(false);

    const patch = mapAdmissionPrefillToStudentProfile(textPrefillRuntimeSample);
    expect(patch.emergencyContactName).toBeUndefined();
    expect(patch.emergencyPhone).toBeUndefined();

    const text = extractAdmissionGuardianPrefillText(textPrefillRuntimeSample);
    expect(text.name).toBe('ولي نصي');
    expect(text.phone).toBe('0611111111');

    const ctx = buildAdmissionRegistrationContext(42, textPrefillRuntimeSample);
    expect(ctx.guardianSelection.selectionRequired).toBe(true);
    expect(ctx.guardianPrefillText.name).toBe('ولي نصي');
  });

  it('applies guardian profile fields only when existing guardian is bound by id', () => {
    const prefill: AdmissionPrefill = {
      ...textPrefillRuntimeSample,
      has_guardian_id: true,
      selection_required: false,
      is_existing_guardian_selected: true,
      guardian_id: 701,
      guardian_selection: {
        selection_required: false,
        has_bound_guardian: true,
        guardian_id: 701,
        is_existing_guardian_selected: true,
      },
      warning_codes: [],
    };
    const selection = resolveAdmissionGuardianSelection(prefill);
    expect(selection.guardianId).toBe(701);
    expect(shouldApplyGuardianPrefillToProfile(selection)).toBe(true);
    const patch = mapAdmissionPrefillToStudentProfile(prefill);
    expect(patch.emergencyContactName).toBe('ولي نصي');
  });
});

describe('existing guardian mode validation', () => {
  it('blocks next/POST when existing mode has no guardian_id', () => {
    const profile = {
      ...defaultStudentProfileFormState(null),
      emergencyContactName: 'ولي نصي',
      emergencyPhone: '0611111111',
    };
    const billing = {
      ...defaultStudentCreateBillingFormState(),
      guardianSourceMode: 'existing' as const,
      linkedGuardianId: null,
      responsibilitySelection: 'guardian' as const,
    };
    const result = validateStudentCreateGuardianContract(profile, billing, t);
    expect(result.valid).toBe(false);
    expect(result.errors.guardianRequired).toBe(
      'admin.student360.create.billing.errors.existingGuardianSelectionRequired',
    );
  });

  it('blocks existing mode without ID when admission selection is required even with empty intake', () => {
    const result = validateStudentCreateGuardianContract(
      defaultStudentProfileFormState(null),
      {
        ...defaultStudentCreateBillingFormState(),
        guardianSourceMode: 'existing',
        linkedGuardianId: null,
        responsibilitySelection: 'needs_selection',
      },
      t,
      { requireExistingGuardianSelection: true },
    );
    expect(result.valid).toBe(false);
  });

  it('accepts existing mode only after linkedGuardianId from search result', () => {
    const profile = {
      ...defaultStudentProfileFormState(null),
      emergencyContactName: 'فاطمة',
      emergencyPhone: '0612345678',
      emergencyRelationship: 'mother',
    };
    const billing = {
      ...defaultStudentCreateBillingFormState(),
      guardianSourceMode: 'existing' as const,
      linkedGuardianId: 701,
      responsibilitySelection: 'guardian' as const,
      billingGuardianEntryKey: 'existing-701',
    };
    const result = validateStudentCreateGuardianContract(profile, billing, t);
    expect(result.valid).toBe(true);

    const payload = applyStudentCreateGuardianAtomicContractToPayload(
      buildStudentCreatePayload(profile, null, { deferGuardianContact: true, admissionId: 42 }),
      profile,
      billing,
    );
    expect(payload.admission_id).toBe(42);
    expect(payload.guardian_relationships).toEqual([
      expect.objectContaining({ guardian_id: 701 }),
    ]);
    expect(JSON.stringify(payload.guardian_relationships)).not.toContain('ولي نصي');
  });
});

describe('new guardian + admission payload', () => {
  it('sends nested guardian object without fake guardian_id and includes admission_id', () => {
    const profile = {
      ...defaultStudentProfileFormState(null),
      emergencyContactName: 'ولي نصي',
      emergencyPhone: '0611111111',
      emergencyRelationship: 'father',
    };
    const billing = {
      ...defaultStudentCreateBillingFormState(),
      guardianSourceMode: 'new' as const,
      responsibilitySelection: 'guardian' as const,
    };
    const payload = applyStudentCreateGuardianAtomicContractToPayload(
      buildStudentCreatePayload(profile, null, { deferGuardianContact: true, admissionId: 99 }),
      profile,
      billing,
    );
    expect(payload.admission_id).toBe(99);
    expect(payload.guardian_relationships?.[0]).toMatchObject({
      guardian: { full_name: 'ولي نصي', phone: '0611111111' },
    });
    expect(payload.guardian_relationships?.[0]).not.toHaveProperty('guardian_id');
    expect(payload.billing_responsibility).toEqual({ mode: 'guardian' });
  });

  it('does not send admission_id for ordinary student create', () => {
    const payload = buildStudentCreatePayload(defaultStudentProfileFormState(null), null, {
      deferGuardianContact: true,
    });
    expect(payload).not.toHaveProperty('admission_id');
  });
});

describe('atomic conversion success parsing', () => {
  it('consumes detail.admission without requiring legacy state', () => {
    const snapshot = parseAdmissionConversionFromCreateResponse({
      id: 5001,
      detail: {
        admission: {
          id: 42,
          student_id: 5001,
          application_status: 'registered',
          registration_flow_state: 'linked',
          converted_at: '2026-07-28T12:00:00Z',
          state: 'done',
        },
      },
    });
    expect(isAdmissionConverted(snapshot)).toBe(true);
    expect(snapshot?.application_status).toBe('registered');
  });

  it('treats missing detail.admission as not yet verified', () => {
    expect(parseAdmissionConversionFromCreateResponse({ id: 5001 })).toBeNull();
    expect(isAdmissionConverted(null)).toBe(false);
  });
});

describe('admission atomic error mapping', () => {
  it('maps guardian_selection_required to Arabic key and stays on guardian step', () => {
    const mapped = mapStudentApiError({ code: 'guardian_selection_required', message: 'x' }, t);
    expect(mapped.message).toBe('admin.admissions.registration.errors.guardianSelectionRequired');
    expect(mapped.stayOnGuardianStep).toBe(true);
    expect(mapped.fieldErrors?.guardianRequired).toBeTruthy();
  });

  it('maps admission_already_converted for refetch path', () => {
    const mapped = mapStudentApiError({ code: 'admission_already_converted', message: 'x' }, t);
    expect(mapped.admissionAlreadyConverted).toBe(true);
    expect(mapped.message).toBe('admin.admissions.registration.errors.admissionAlreadyConverted');
  });
});
