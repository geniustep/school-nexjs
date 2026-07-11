import { describe, expect, it } from 'vitest';
import {
  addFamilyChild,
  emptyFamilyAdmissionFormState,
  removeFamilyChild,
  updateFamilyChild,
} from './family-admission-form-state';
import {
  intakeFromFamilyChild,
  patchFamilyChildFromIntake,
} from './family-admission-child-intake';
import {
  buildCreateFamilyBatchPayload,
  buildFamilyBatchChildPayload,
  resolveChildResidenceAddress,
  validateFamilyAdmissionForm,
} from './family-admission-payload';
import {
  createFamilyAdmissionIdempotencyKey,
  FamilyAdmissionIdempotencySession,
} from './family-admission-idempotency';
import {
  familyBatchApplicationReference,
  normalizeFamilyBatchCreateData,
  normalizeFamilyBatchDetail,
} from './family-admission-normalize';
import { isFamilyBatchReplay, normalizeFamilyBatchCreateResponse } from './family-admission-response';
import {
  hasFamilyBatchLink,
  shouldShowFamilyBadge,
} from './family-admission-visibility';

import {
  createPrimaryGuardianDraft,
} from '@/features/admin/admissions/guardians';
import { buildCreateAdmissionPayload, emptyAdmissionCreateForm } from './admission-create-payload';
import frMessages from '../../../../../messages/fr.json';

const levels = [
  { id: 77, name: 'CP', cycle: 'primary', requires_stream: false },
  { id: 2447, name: '2 APIC', cycle: 'middle_school', requires_stream: false },
];

function sampleForm() {
  const form = emptyFamilyAdmissionFormState('2026-07-09');
  form.family = {
    shared_address: 'الدار البيضاء',
    notes: 'ملاحظات الأسرة',
    source_id: 10,
    academic_year_id: 1,
    first_contact_date: '2026-07-09',
  };
  form.guardians = [
    {
      ...createPrimaryGuardianDraft(),
      name: 'أحمد العلوي',
      phone: '0612345678',
      whatsapp: '0612345678',
      email: 'ahmed@example.com',
      relationship: 'father',
      appliesToAllChildren: true,
    },
  ];
  form.children[0] = {
    ...form.children[0],
    child_first_name_ar: 'سلمى',
    child_last_name_ar: 'العلوي',
    gender: 'female',
    birth_date: '2018-05-15',
    requested_cycle_code: 'primary',
    requested_level_id: 77,
  };
  form.children[1] = {
    ...form.children[1],
    child_first_name_ar: 'ياسين',
    child_last_name_ar: 'العلوي',
    gender: 'male',
    birth_date: '2016-03-20',
    requested_cycle_code: 'middle_school',
    requested_level_id: 2447,
    use_different_address: true,
    residence_address: 'الرباط',
  };
  return form;
}

describe('family admission child intake field mapping', () => {
  it('maps every writable family-child intake field into child state', () => {
    const patch = patchFamilyChildFromIntake({
      firstNameAr: 'سلمى',
      lastNameAr: 'العلوي',
      firstNameFr: 'Salma',
      lastNameFr: 'Alaoui',
      gender: 'female',
      birthDate: '2018-05-15',
      massarCode: 'G123456789',
      previousSchool: 'مدرسة سابقة',
      cycleCode: 'primary',
      levelId: '77',
      streamId: '12',
      residenceAddress: 'الرباط',
      externalReference: 'EXT-1',
    });

    expect(patch).toEqual({
      child_first_name_ar: 'سلمى',
      child_last_name_ar: 'العلوي',
      child_first_name_fr: 'Salma',
      child_last_name_fr: 'Alaoui',
      gender: 'female',
      birth_date: '2018-05-15',
      massar_code: 'G123456789',
      previous_school: 'مدرسة سابقة',
      requested_cycle_code: 'primary',
      requested_level_id: 77,
      requested_stream_id: 12,
      residence_address: 'الرباط',
      external_reference: 'EXT-1',
    });
  });

  it('ignores intake fields that family children do not store', () => {
    const patch = patchFamilyChildFromIntake({
      birthPlace: 'فاس',
      nationalityId: '1',
      schoolNumber: '99',
      code: 'STU-1',
      admissionDate: '2026-07-01',
    });
    expect(patch).toEqual({});
  });

  it('round-trips mapped identity values through child state updates', () => {
    let form = emptyFamilyAdmissionFormState();
    const localId = form.children[0].localId;
    const intakePatch = patchFamilyChildFromIntake({
      firstNameAr: 'ياسين',
      lastNameAr: 'العلوي',
      gender: 'male',
      birthDate: '2016-03-20',
      massarCode: 'G111111111',
    });
    form = updateFamilyChild(form, localId, intakePatch);
    const values = intakeFromFamilyChild(form.children[0]);
    expect(values.firstNameAr).toBe('ياسين');
    expect(values.lastNameAr).toBe('العلوي');
    expect(values.gender).toBe('male');
    expect(values.birthDate).toBe('2016-03-20');
    expect(values.massarCode).toBe('G111111111');
  });
});

describe('family admission payload contract', () => {
  it('includes shared_contact in create payload', () => {
    const payload = buildCreateFamilyBatchPayload(sampleForm(), 3, 'fam-adm-test-key', levels);
    expect(payload.shared_contact.guardian_name).toBe('أحمد العلوي');
    expect(payload.shared_contact.guardian_phone).toBe('0612345678');
    expect(payload.shared_contact.relationship).toBe('father');
    expect(payload.notes).toBe('ملاحظات الأسرة');
  });

  it('uses children instead of applications', () => {
    const payload = buildCreateFamilyBatchPayload(sampleForm(), 3, 'fam-adm-test-key', levels);
    expect(payload.children).toHaveLength(2);
    expect('applications' in payload).toBe(false);
  });

  it('does not send flat guardian fields outside shared_contact', () => {
    const payload = buildCreateFamilyBatchPayload(sampleForm(), 3, 'fam-adm-test-key', levels);
    expect('guardian_name' in payload).toBe(false);
    expect('guardian_phone' in payload).toBe(false);
    expect('guardian_whatsapp' in payload).toBe(false);
    expect('guardian_email' in payload).toBe(false);
    expect('relationship' in payload).toBe(false);
  });

  it('places shared_address at batch level', () => {
    const payload = buildCreateFamilyBatchPayload(sampleForm(), 3, 'fam-adm-test-key', levels);
    expect(payload.shared_address).toBe('الدار البيضاء');
  });

  it('inherits shared address for children by default', () => {
    const child = emptyFamilyAdmissionFormState().children[0];
    expect(resolveChildResidenceAddress(child, 'Casablanca')).toBe('Casablanca');
    expect(
      buildFamilyBatchChildPayload(child, 'Casablanca', levels).residence_address,
    ).toBe('Casablanca');
  });

  it('uses child address override when enabled', () => {
    const child = {
      ...emptyFamilyAdmissionFormState().children[0],
      use_different_address: true,
      residence_address: 'Rabat',
    };
    expect(resolveChildResidenceAddress(child, 'Casablanca')).toBe('Rabat');
    expect(
      buildFamilyBatchChildPayload(child, 'Casablanca', levels).residence_address,
    ).toBe('Rabat');
  });

  it('puts guardian_id inside shared_contact when linked', () => {
    const form = sampleForm();
    form.guardians[0] = { ...form.guardians[0], guardianId: 42 };
    const payload = buildCreateFamilyBatchPayload(form, 3, 'key', levels);
    expect(payload.shared_contact.guardian_id).toBe(42);
    expect('guardian_id' in payload).toBe(false);
  });

  it('requires at least two children', () => {
    const form = emptyFamilyAdmissionFormState();
    form.guardians[0] = {
      ...form.guardians[0],
      name: 'Parent',
      phone: '0612345678',
    };
    form.family.academic_year_id = 3;
    form.children = [form.children[0]];

    expect(validateFamilyAdmissionForm(form)?.code).toBe('too_few_children');
  });

  it('accepts children with name and level only (dob/gender optional)', () => {
    const form = sampleForm();
    form.children[0] = {
      ...form.children[0],
      gender: '',
      birth_date: '',
    };
    form.children[1] = {
      ...form.children[1],
      gender: '',
      birth_date: '',
    };
    expect(validateFamilyAdmissionForm(form)).toBeNull();
  });

  it('does not block when only birth_date is missing', () => {
    const form = sampleForm();
    form.children[0] = { ...form.children[0], birth_date: '' };
    expect(validateFamilyAdmissionForm(form)).toBeNull();
  });

  it('does not block when only gender is missing', () => {
    const form = sampleForm();
    form.children[0] = { ...form.children[0], gender: '' };
    expect(validateFamilyAdmissionForm(form)).toBeNull();
  });

  it('blocks when name is missing', () => {
    const form = sampleForm();
    form.children[0] = {
      ...form.children[0],
      child_first_name_ar: '',
      child_last_name_ar: '',
      child_first_name_fr: '',
      child_last_name_fr: '',
    };
    const err = validateFamilyAdmissionForm(form);
    expect(err?.code).toBe('child_missing_fields');
    expect(err?.childIndex).toBe(0);
  });

  it('blocks when level is missing', () => {
    const form = sampleForm();
    form.children[1] = { ...form.children[1], requested_level_id: undefined };
    const err = validateFamilyAdmissionForm(form);
    expect(err?.code).toBe('child_missing_fields');
    expect(err?.childIndex).toBe(1);
  });

  it('allows create when one of two children lacks dob and gender', () => {
    const form = sampleForm();
    form.children[1] = { ...form.children[1], gender: '', birth_date: '' };
    expect(validateFamilyAdmissionForm(form)).toBeNull();
    const payload = buildCreateFamilyBatchPayload(form, 3, 'key-opt', levels);
    expect(payload.children).toHaveLength(2);
    expect(payload.children[1].birth_date).toBeUndefined();
    expect(payload.children[1].gender).toBeUndefined();
    expect(payload.children[0].birth_date).toBe('2018-05-15');
    expect(payload.children[0].gender).toBe('female');
  });

  it('omits empty optional dob/gender from child payload without placeholders', () => {
    const child = {
      ...emptyFamilyAdmissionFormState().children[0],
      child_first_name_ar: 'نور',
      requested_level_id: 77,
      gender: '',
      birth_date: '',
    };
    const payload = buildFamilyBatchChildPayload(child, '', levels);
    expect(payload).not.toHaveProperty('birth_date');
    expect(payload).not.toHaveProperty('gender');
    expect(payload.requested_level_id).toBe(77);
    expect(payload.child_first_name_ar).toBe('نور');
  });

  it('keeps provided dob and gender in child payload', () => {
    const child = {
      ...emptyFamilyAdmissionFormState().children[0],
      child_first_name_ar: 'نور',
      requested_level_id: 77,
      gender: 'female',
      birth_date: '2019-02-01',
    };
    const payload = buildFamilyBatchChildPayload(child, '', levels);
    expect(payload.birth_date).toBe('2019-02-01');
    expect(payload.gender).toBe('female');
  });

  it('French childMissingFields message no longer requires dob or gender', () => {
    const msg = frMessages.admin.admissions.family.errors.childMissingFields;
    expect(msg).toContain('nom ou niveau');
    expect(msg.toLowerCase()).not.toContain('date de naissance');
    expect(msg.toLowerCase()).not.toContain('genre');
  });

  it('individual admission create omits empty dob/gender without placeholders', () => {
    const form = emptyAdmissionCreateForm();
    form.child_first_name_ar = 'أحمد';
    form.requested_level_id = 77;
    form.gender = '';
    form.birth_date = '';
    form.guardians = [
      {
        ...createPrimaryGuardianDraft(),
        name: 'ولي',
        phone: '0611111111',
      },
    ];
    const payload = buildCreateAdmissionPayload(form, 3, levels);
    expect(payload).not.toHaveProperty('birth_date');
    expect(payload).not.toHaveProperty('gender');
    expect(payload.requested_level_id).toBe(77);
  });

  it('supports add/remove child behavior with minimum guard', () => {
    let form = emptyFamilyAdmissionFormState();
    expect(form.children).toHaveLength(2);

    form = addFamilyChild(form);
    expect(form.children).toHaveLength(3);

    const thirdId = form.children[2].localId;
    form = removeFamilyChild(form, thirdId);
    expect(form.children).toHaveLength(2);
  });
});

describe('family admission idempotency', () => {
  it('keeps idempotency key stable across retry', () => {
    const session = new FamilyAdmissionIdempotencySession();
    const first = session.ensureKey();
    const second = session.ensureKey();
    expect(first).toBe(second);

    session.reset();
    expect(session.ensureKey()).not.toBe(first);
  });

  it('creates unique keys for new sessions', () => {
    const a = createFamilyAdmissionIdempotencyKey();
    const b = createFamilyAdmissionIdempotencyKey();
    expect(a).not.toBe(b);
  });
});

describe('family admission response mapping', () => {
  const backendCreate = {
    batch_id: 38,
    name: 'FB/2026/00038',
    family_reference: 'FAM-2026-00033',
    school_id: 3,
    application_count: 2,
    applications: [
      { id: 4155, name: 'ADM/2026/04158', student_name: 'ProbeA Smoke', state: 'new' },
      { id: 4156, name: 'ADM/2026/04159', student_name: 'ProbeB Smoke', state: 'new' },
    ],
  };

  it('maps create response via batch_id and application_count', () => {
    const normalized = normalizeFamilyBatchCreateData(backendCreate);
    expect(normalized.batch_id).toBe(38);
    expect(normalized.application_count).toBe(2);
    expect(normalized.applications).toHaveLength(2);
  });

  it('maps application name to display reference', () => {
    const ref = familyBatchApplicationReference(backendCreate.applications[0]);
    expect(ref).toBe('ADM/2026/04158');
  });

  it('maps 201 created success', () => {
    const outcome = normalizeFamilyBatchCreateResponse(
      { success: true, data: backendCreate, meta: { http_status: 201 } },
      201,
    );
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.replay).toBe(false);
      expect(outcome.data.batch_id).toBe(38);
      expect(outcome.data.application_count).toBe(2);
    }
  });

  it('maps 200 replay success', () => {
    const outcome = normalizeFamilyBatchCreateResponse(
      {
        success: true,
        data: { ...backendCreate, idempotent_replay: true },
        meta: { http_status: 200 },
      },
      200,
    );
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.replay).toBe(true);
    }
    expect(
      isFamilyBatchReplay({ ...backendCreate, idempotent_replay: true }, { http_status: 200 }, 200),
    ).toBe(true);
  });

  it('maps 409 idempotency conflict UI state', () => {
    const outcome = normalizeFamilyBatchCreateResponse({
      success: false,
      error: {
        code: 'family_batch_idempotency_conflict',
        message: 'Conflict',
      },
      meta: { http_status: 409 },
    });
    expect(outcome).toEqual({ kind: 'idempotency_conflict' });
  });

  it('maps GET detail for family panel', () => {
    const detail = normalizeFamilyBatchDetail({
      batch_id: 38,
      name: 'FB/2026/00038',
      family_reference: 'FAM-2026-00033',
      application_count: 2,
      shared_contact: {
        guardian_name: 'Probe Guardian',
        guardian_phone: '0612345678',
      },
      applications: backendCreate.applications,
    });
    expect(detail.batch_id).toBe(38);
    expect(detail.application_count).toBe(2);
    expect(detail.shared_contact?.guardian_name).toBe('Probe Guardian');
    expect(detail.applications[0].name).toBe('ADM/2026/04158');
  });
});

describe('family admission visibility', () => {
  it('shows family badge when family_size > 1', () => {
    expect(shouldShowFamilyBadge({ family_size: 3, family_batch_id: 9 })).toBe(true);
    expect(shouldShowFamilyBadge({ family_size: 1, family_batch_id: 9 })).toBe(false);
  });

  it('does not affect legacy admissions without family fields', () => {
    const legacy = {
      family_batch_id: undefined,
      family_size: undefined,
    };
    expect(shouldShowFamilyBadge(legacy)).toBe(false);
    expect(hasFamilyBatchLink(legacy)).toBe(false);
  });
});
